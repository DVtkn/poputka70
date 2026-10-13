import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { errors, fail, ok, serverError } from "@/lib/http";
import { CANCEL_CUTOFF_MINUTES, cancelBooking } from "@/lib/bookings";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  const { id: bookingId } = await context.params;
  if (!bookingId) return errors.badRequest("Не указана бронь");

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        passengerId: true,
        status: true,
        trip: { select: { departureTime: true } },
      },
    });

    if (!booking) return errors.notFound("Бронь не найдена");
    if (booking.passengerId !== sessionUser.id) return errors.forbidden("Это не твоя бронь");
    if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
      return errors.conflict("Бронь уже не активна");
    }

    const cutoff = booking.trip.departureTime.getTime() - CANCEL_CUTOFF_MINUTES * 60 * 1000;
    if (Date.now() > cutoff) {
      return fail(
        "CONFLICT",
        `Отменить бронь можно не позднее чем за ${CANCEL_CUTOFF_MINUTES} минут до отправления`,
        409
      );
    }

    const result = await cancelBooking(bookingId, "PASSENGER");
    if (!result.cancelled) {
      return errors.conflict("Бронь уже не активна");
    }

    return ok({ cancelled: true, refunded: result.refunded });
  } catch (error) {
    return serverError("bookings.cancel", error);
  }
}
