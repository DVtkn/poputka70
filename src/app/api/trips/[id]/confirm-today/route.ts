import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { errors, ok, serverError } from "@/lib/http";
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
        driverConfirmed: true,
        routeTemplate: {
          select: {
            driverId: true,
            origin: { select: { name: true } },
            destination: { select: { name: true } },
          },
        },
      },
    });

    if (!trip) return errors.notFound("Поездка не найдена");
    if (trip.routeTemplate.driverId !== sessionUser.id) {
      return errors.forbidden("Это не твоя поездка");
    }
    if (!["SCHEDULED", "PENDING_CONFIRMATION"].includes(trip.status)) {
      return errors.conflict("Поездку нельзя подтвердить в текущем статусе");
    }
    if (trip.departureTime.getTime() < Date.now() - 15 * 60 * 1000) {
      return errors.conflict("Время отправления уже прошло");
    }

    const updated = await prisma.trip.updateMany({
      where: { id: tripId, driverConfirmed: false, status: { in: ["SCHEDULED", "PENDING_CONFIRMATION"] } },
      data: {
        driverConfirmed: true,
        confirmedAt: new Date(),
        confirmationDeadline: null,
        status: "CONFIRMED",
      },
    });
    if (updated.count === 0) {
      return errors.conflict("Поездка уже подтверждена");
    }

    const passengers = await prisma.booking.findMany({
      where: { tripId, status: { in: ["PENDING", "CONFIRMED"] } },
      select: { id: true, passengerId: true },
    });

    if (passengers.length > 0) {
      await prisma.booking.updateMany({
        where: { id: { in: passengers.map((b) => b.id) } },
        data: { status: "CONFIRMED" },
      });

      const route = `${trip.routeTemplate.origin.name} → ${trip.routeTemplate.destination.name}`;
      const title = "Поездка подтверждена";
      const body = `Водитель подтвердил поездку ${route}. Встречаемся в точке отправления.`;

      await prisma.notification.createMany({
        data: passengers.map((booking) => ({
          userId: booking.passengerId,
          type: "TRIP_CONFIRMED",
          title,
          body,
          relatedEntityId: tripId,
        })),
      });
      await sendNotificationToUsers(
        passengers.map((b) => b.passengerId),
        createNotificationPayload(title, body, { url: "/profile/bookings" })
      );
    }

    return ok({ confirmed: true });
  } catch (error) {
    return serverError("trips.confirm", error);
  }
}
