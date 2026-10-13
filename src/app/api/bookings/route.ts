import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { errors, fail, ok, parseBody, serverError, type ApiErrorCode } from "@/lib/http";
import { bookingCreateSchema } from "@/lib/schemas";
import { ACTIVE_TRIP_STATUSES, PAYMENT_WINDOW_MINUTES, expireOverdueBookingsForTrip } from "@/lib/bookings";
import { getDistanceKm } from "@/lib/pricing";
import { rateLimitByUser } from "@/lib/rate-limit";

class DomainError extends Error {
  constructor(
    readonly apiCode: ApiErrorCode,
    readonly httpStatus: number,
    message: string
  ) {
    super(message);
  }
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  const parsed = await parseBody(request, bookingCreateSchema);
  if (!parsed.ok) return parsed.response;

  const { tripId } = parsed.data;

  const limited = rateLimitByUser("bookings:create", sessionUser.id, 20, 60 * 60 * 1000);
  if (!limited.allowed) return errors.rateLimited(limited.retryAfterSec);

  const now = new Date();

  try {
    // Снимаем залипшие неоплаченные брони этой поездки, чтобы места не пропадали
    await expireOverdueBookingsForTrip(tripId, now);

    const preview = await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        routeTemplate: {
          select: {
            origin: { select: { lat: true, lng: true } },
            destination: { select: { lat: true, lng: true } },
          },
        },
      },
    });

    // Дистанцию считаем вне транзакции (кэш + таймаут внутри)
    const distanceKm = preview
      ? await getDistanceKm(
          preview.routeTemplate.origin.lat,
          preview.routeTemplate.origin.lng,
          preview.routeTemplate.destination.lat,
          preview.routeTemplate.destination.lng
        )
      : null;

    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        select: {
          id: true,
          status: true,
          departureTime: true,
          routeTemplate: {
            select: { price: true, serviceFee: true, driverId: true },
          },
        },
      });

      if (!trip) throw new DomainError("NOT_FOUND", 404, "Поездка не найдена");
      if (trip.routeTemplate.driverId === sessionUser.id) {
        throw new DomainError("BAD_REQUEST", 400, "Нельзя забронировать свой маршрут");
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
        throw new DomainError("CONFLICT", 409, "Мест больше нет");
      }

      const existingActive = await tx.booking.findFirst({
        where: { tripId, passengerId: sessionUser.id, status: { in: ["PENDING", "CONFIRMED"] } },
        select: { id: true },
      });
      if (existingActive) {
        throw new DomainError("CONFLICT", 409, "Вы уже забронировали это место");
      }

      const compensationAmount = trip.routeTemplate.price;
      const serviceFeeAmount =
        trip.routeTemplate.serviceFee || Math.round(compensationAmount * 0.15);
      const totalAmount = compensationAmount + serviceFeeAmount;

      const byWindow = new Date(now.getTime() + PAYMENT_WINDOW_MINUTES * 60 * 1000);
      const byDeparture = new Date(trip.departureTime.getTime() - 60 * 60 * 1000);
      const paymentDeadline = byWindow < byDeparture ? byWindow : byDeparture;

      const booking = await tx.booking.create({
        data: {
          tripId,
          passengerId: sessionUser.id,
          compensationAmount,
          serviceFeeAmount,
          totalAmount,
          distanceKm,
          pricingVersion: "v1.0",
          status: "PENDING",
          serviceFeeStatus: "PENDING",
          offerAccepted: true,
          paymentDeadline,
        },
        select: { id: true },
      });

      return { bookingId: booking.id, compensationAmount, serviceFeeAmount, totalAmount };
    });

    return ok({
      booking: {
        id: result.bookingId,
        compensation: result.compensationAmount,
        serviceFee: result.serviceFeeAmount,
        total: result.totalAmount,
      },
    });
  } catch (error) {
    if (error instanceof DomainError) {
      return fail(error.apiCode, error.message, error.httpStatus);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return errors.conflict("Вы уже забронировали это место");
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
        paymentDeadline: true,
        createdAt: true,
        trip: {
          select: {
            id: true,
            date: true,
            departureTime: true,
            status: true,
            routeTemplate: {
              select: {
                departureTime: true,
                origin: { select: { name: true } },
                destination: { select: { name: true } },
                driver: { select: { id: true, firstName: true, lastName: true } },
              },
            },
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
