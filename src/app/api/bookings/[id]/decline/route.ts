import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { errors, ok, serverError } from "@/lib/http";
import { cancelBooking } from "@/lib/bookings";
import { tripRoute } from "@/lib/trip-rules";
import { tripRouteSelect } from "@/lib/trips";

/** Водитель вежливо отклоняет заявку: место возвращается, пассажиру — уведомление. */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  const { id: bookingId } = await context.params;
  if (!bookingId) return errors.badRequest("Не указана заявка");

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, trip: { select: tripRouteSelect } },
    });
    if (!booking) return errors.notFound("Заявка не найдена");

    const route = tripRoute(booking.trip);
    if (!route || route.driverId !== sessionUser.id) {
      return errors.forbidden("Это не твоя заявка");
    }

    const result = await cancelBooking(bookingId, "DRIVER", new Date(), {
      bodyOverride: `Поездка ${route.originName} → ${route.destName}: водитель не смог взять тебя в этот раз.`,
    });
    if (!result.cancelled) {
      return errors.conflict("Заявка уже не в очереди");
    }

    return ok({ declined: true });
  } catch (error) {
    return serverError("bookings.decline", error);
  }
}
