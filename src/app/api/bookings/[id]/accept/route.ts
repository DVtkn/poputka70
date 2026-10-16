import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { errors, ok, serverError } from "@/lib/http";
import { tripRoute } from "@/lib/trip-rules";
import { tripRouteSelect } from "@/lib/trips";
import { createNotificationPayload, sendNotificationToUser } from "@/lib/push";
import { formatTomskTime } from "@/lib/time";

/** Водитель принимает заявку: «Тебя приняли». */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  const { id: bookingId } = await context.params;
  if (!bookingId) return errors.badRequest("Не указана заявка");

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        passengerId: true,
        status: true,
        pickupName: true,
        dropoffName: true,
        trip: { select: { departureTime: true, ...tripRouteSelect } },
      },
    });
    if (!booking) return errors.notFound("Заявка не найдена");

    const route = tripRoute(booking.trip);
    if (!route || route.driverId !== sessionUser.id) {
      return errors.forbidden("Это не твоя заявка");
    }
    if (booking.status !== "PENDING") {
      return errors.conflict("Заявка уже не в очереди");
    }

    const updated = await prisma.booking.updateMany({
      where: { id: bookingId, status: "PENDING" },
      data: { status: "CONFIRMED" },
    });
    if (updated.count === 0) {
      return errors.conflict("Заявка уже не в очереди");
    }

    const title = "Тебя приняли";
    const body = `${route.originName} → ${route.destName}, ${formatTomskTime(booking.trip.departureTime)}. Водитель ждёт тебя${
      booking.pickupName ? ` на остановке «${booking.pickupName}»` : ""
    }.`;

    await prisma.notification.create({
      data: { userId: booking.passengerId, type: "BOOKING_ACCEPTED", title, body, relatedEntityId: bookingId },
    });
    await sendNotificationToUser(
      booking.passengerId,
      createNotificationPayload(title, body, { url: "/profile/bookings" })
    ).catch(() => 0);

    return ok({ accepted: true });
  } catch (error) {
    return serverError("bookings.accept", error);
  }
}
