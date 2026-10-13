import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { errors, ok, serverError } from "@/lib/http";
import { cancelBooking } from "@/lib/bookings";
import { createNotificationPayload, sendNotificationToUsers } from "@/lib/push";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  const { id: tripId } = await context.params;
  if (!tripId) return errors.badRequest("Не указана поездка");

  try {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        status: true,
        departureTime: true,
        routeTemplate: {
          select: {
            driverId: true,
            origin: { select: { name: true } },
            destination: { select: { name: true } },
          },
        },
        bookings: {
          where: { status: { in: ["PENDING", "CONFIRMED"] } },
          select: { id: true, passengerId: true },
        },
      },
    });

    if (!trip) return errors.notFound("Поездка не найдена");
    if (trip.routeTemplate.driverId !== sessionUser.id) {
      return errors.forbidden("Это не твоя поездка");
    }
    if (trip.status === "IN_PROGRESS") {
      return errors.conflict("Поездка уже началась");
    }
    if (trip.status === "COMPLETED" || trip.status.startsWith("CANCELLED")) {
      return errors.conflict("Поездку нельзя отменить");
    }

    const cancelled = await prisma.trip.updateMany({
      where: {
        id: tripId,
        status: { in: ["SCHEDULED", "PENDING_CONFIRMATION", "CONFIRMED"] },
      },
      data: { status: "CANCELLED_BY_DRIVER" },
    });
    if (cancelled.count === 0) {
      return errors.conflict("Поездку нельзя отменить в текущем статусе");
    }

    const route = `${trip.routeTemplate.origin.name} → ${trip.routeTemplate.destination.name}`;
    const now = new Date();

    for (const booking of trip.bookings) {
      await cancelBooking(booking.id, "DRIVER", now, {
        bodyOverride: `Поездка ${route} отменена водителем.`,
      });
    }

    if (trip.bookings.length > 0) {
      await sendNotificationToUsers(
        trip.bookings.map((b) => b.passengerId),
        createNotificationPayload("Поездка отменена водителем", `Поездка ${route} отменена.`, {
          url: "/profile/bookings",
        })
      );
    }

    return ok({ cancelled: true, affectedBookings: trip.bookings.length });
  } catch (error) {
    return serverError("trips.cancel", error);
  }
}
