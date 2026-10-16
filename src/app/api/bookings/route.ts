import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { errors, fail, ok, parseBody, serverError, type ApiErrorCode } from "@/lib/http";
import { bookingRequestSchema } from "@/lib/schemas";
import { ACTIVE_TRIP_STATUSES, expireOverdueBookingsForTrip } from "@/lib/bookings";
import { quoteLeg, tripRouteSelect } from "@/lib/trips";
import { tripRoute } from "@/lib/trip-rules";
import { rateLimitByUser } from "@/lib/rate-limit";
import { createNotificationPayload, sendNotificationToUser } from "@/lib/push";
import { formatTomskTime } from "@/lib/time";

class DomainError extends Error {
  constructor(
    readonly apiCode: ApiErrorCode,
    readonly httpStatus: number,
    message: string
  ) {
    super(message);
  }
}

/** Пассажир просит место: «Запросить место». */
export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  const parsed = await parseBody(request, bookingRequestSchema);
  if (!parsed.ok) return parsed.response;

  const { tripId, pickupStopId, dropoffStopId, note } = parsed.data;

  const limited = rateLimitByUser("bookings:create", sessionUser.id, 20, 60 * 60 * 1000);
  if (!limited.allowed) return errors.rateLimited(limited.retryAfterSec);

  const now = new Date();

  try {
    await expireOverdueBookingsForTrip(tripId, now);

    const quoted = await quoteLeg(tripId, pickupStopId ?? null, dropoffStopId ?? null);
    if (!quoted.ok) {
      return quoted.error === "Поездка не найдена"
        ? errors.notFound(quoted.error)
        : errors.conflict(quoted.error);
    }
    const quote = quoted.quote;

    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        select: {
          id: true,
          status: true,
          departureTime: true,
          driverId: true,
          routeTemplate: { select: { driverId: true } },
        },
      });

      if (!trip) throw new DomainError("NOT_FOUND", 404, "Поездка не найдена");

      const driverId = trip.driverId ?? trip.routeTemplate?.driverId ?? null;
      if (!driverId) throw new DomainError("CONFLICT", 409, "Маршрут поездки не определён");
      if (driverId === sessionUser.id) {
        throw new DomainError("BAD_REQUEST", 400, "Это твоя поездка — просто поезжай");
      }
      if (trip.departureTime.getTime() <= now.getTime()) {
        throw new DomainError("CONFLICT", 409, "Поездка уже началась");
      }
      if (!ACTIVE_TRIP_STATUSES.includes(trip.status as (typeof ACTIVE_TRIP_STATUSES)[number])) {
        throw new DomainError("CONFLICT", 409, "Места на эту поездку недоступны");
      }

      const reserved = await tx.trip.updateMany({
        where: {
          id: tripId,
          status: { in: [...ACTIVE_TRIP_STATUSES] },
          availableSeats: { gt: 0 },
        },
        data: { availableSeats: { decrement: 1 } },
      });
      if (reserved.count === 0) {
        throw new DomainError("CONFLICT", 409, "Свободных мест больше нет");
      }

      const existingActive = await tx.booking.findFirst({
        where: { tripId, passengerId: sessionUser.id, status: { in: ["PENDING", "CONFIRMED"] } },
        select: { id: true },
      });
      if (existingActive) {
        throw new DomainError("CONFLICT", 409, "Ты уже просил место в этой поездке");
      }

      const booking = await tx.booking.create({
        data: {
          tripId,
          passengerId: sessionUser.id,
          compensationAmount: quote.amount,
          serviceFeeAmount: 0,
          totalAmount: quote.amount,
          amountDue: quote.amount,
          distanceKm: quote.distanceKm,
          pricingVersion: "v2",
          status: "PENDING",
          serviceFeeStatus: "PENDING",
          offerAccepted: true,
          paymentDeadline: null,
          pickupStopId: quote.pickupStopId,
          dropoffStopId: quote.dropoffStopId,
          pickupName: quote.pickupName,
          dropoffName: quote.dropoffName,
          note: note || null,
        },
        select: { id: true },
      });

      return { bookingId: booking.id, driverId };
    });

    // Водителю — «Новая заявка»
    try {
      const display = await prisma.trip.findUnique({
        where: { id: tripId },
        select: { departureTime: true, ...tripRouteSelect },
      });
      const route = display ? tripRoute(display) : null;
      const time = display ? formatTomskTime(display.departureTime) : "";
      const title = "Новая заявка";
      const body = `${sessionUser.firstName}: ${quote.pickupName} → ${quote.dropoffName}, ${time}${
        quote.amount > 0 ? ` · ${quote.amount} ₽` : ""
      }`;

      await prisma.notification.create({
        data: { userId: result.driverId, type: "BOOKING_REQUESTED", title, body, relatedEntityId: result.bookingId },
      });
      await sendNotificationToUser(
        result.driverId,
        createNotificationPayload(title, route ? `${route.originName} → ${route.destName}: ${body.split(": ")[1]}` : body, {
          url: "/profile/trips",
        })
      ).catch(() => 0);
    } catch (notifyError) {
      console.error("[bookings.create] не удалось уведомить водителя", notifyError);
    }

    return ok({
      booking: {
        id: result.bookingId,
        amount: quote.amount,
        pickupName: quote.pickupName,
        dropoffName: quote.dropoffName,
      },
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return fail(error.apiCode, error.message, error.httpStatus);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return errors.conflict("Ты уже просил место в этой поездке");
    }
    return serverError("bookings.create", error);
  }
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  try {
    const bookings = await prisma.booking.findMany({
      where: { passengerId: sessionUser.id },
      select: {
        id: true,
        status: true,
        serviceFeeStatus: true,
        compensationAmount: true,
        serviceFeeAmount: true,
        totalAmount: true,
        amountDue: true,
        pickupName: true,
        dropoffName: true,
        paymentDeadline: true,
        createdAt: true,
        trip: {
          select: {
            id: true,
            date: true,
            departureTime: true,
            status: true,
            ...tripRouteSelect,
            driver: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return ok({ bookings });
  } catch (error) {
    return serverError("bookings.list", error);
  }
}
