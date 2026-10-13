import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { errors, fail, ok, parseBody, serverError } from "@/lib/http";
import { paymentCreateSchema } from "@/lib/schemas";
import { createPayment, getPayment, isYooKassaConfigured } from "@/lib/yookassa";
import { cancelBooking } from "@/lib/bookings";
import { rateLimitByUser } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  const parsed = await parseBody(request, paymentCreateSchema);
  if (!parsed.ok) return parsed.response;

  const { bookingId } = parsed.data;

  const limited = rateLimitByUser("payments:create", sessionUser.id, 10, 60 * 60 * 1000);
  if (!limited.allowed) return errors.rateLimited(limited.retryAfterSec);

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        passengerId: true,
        status: true,
        serviceFeeStatus: true,
        serviceFeeAmount: true,
        paymentReference: true,
        paymentDeadline: true,
        offerAccepted: true,
        trip: {
          select: {
            departureTime: true,
            routeTemplate: {
              select: {
                origin: { select: { name: true } },
                destination: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!booking) return errors.notFound("Бронирование не найдено");
    if (booking.passengerId !== sessionUser.id) return errors.forbidden("Это не твоё бронирование");

    if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
      return errors.conflict("Бронь не активна");
    }
    if (booking.trip.departureTime.getTime() <= Date.now()) {
      return errors.conflict("Поездка уже началась");
    }
    if (booking.paymentDeadline && booking.paymentDeadline.getTime() <= Date.now()) {
      await cancelBooking(bookingId, "EXPIRED");
      return errors.conflict("Время на оплату истекло — бронь снята");
    }
    if (!booking.offerAccepted) {
      return errors.badRequest("Не принята оферта");
    }
    if (booking.serviceFeeStatus === "PAID") {
      return errors.conflict("Уже оплачено");
    }

    if (!isYooKassaConfigured()) {
      return fail(
        "PAYMENT_REQUIRED",
        "Онлайн-оплата ещё не подключена. Бронь сохранена — сбор оплатишь после подключения.",
        503
      );
    }

    // Если незавершённый платёж уже есть — переиспользуем его
    if (booking.paymentReference) {
      try {
        const existing = await getPayment(booking.paymentReference);
        if (existing.status === "pending" && existing.confirmation?.confirmation_url) {
          return ok({
            paymentUrl: existing.confirmation.confirmation_url,
            paymentId: existing.id,
            reused: true,
          });
        }
      } catch (error) {
        console.error("[payments.create] повторная проверка платежа не удалась", error);
      }
    }

    const route = `${booking.trip.routeTemplate.origin.name} → ${booking.trip.routeTemplate.destination.name}`;
    const customerEmail = sessionUser.login?.includes("@")
      ? sessionUser.login
      : `${sessionUser.id.slice(0, 8)}@poputka70.ru`;
    const amountValue = booking.serviceFeeAmount.toFixed(2);

    const idempotenceKey = booking.paymentReference
      ? `booking-${booking.id}-${Date.now()}`
      : `booking-${booking.id}`;

    const payment = await createPayment(
      {
        amount: { value: amountValue, currency: "RUB" },
        confirmation: {
          type: "redirect",
          return_url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/profile/bookings?paid=${booking.id}`,
        },
        capture: true,
        description: `Сервисный сбор Попутка70: ${route}`,
        metadata: { bookingId: booking.id, type: "service_fee" },
        receipt: {
          customer: { email: customerEmail },
          items: [
            {
              description: "Сервисный сбор за бронирование места",
              quantity: "1",
              amount: { value: amountValue, currency: "RUB" },
              vat_code: 1,
              payment_mode: "full_payment",
              payment_subject: "service",
            },
          ],
        },
      },
      idempotenceKey
    );

    await prisma.booking.update({
      where: { id: bookingId },
      data: { paymentReference: payment.id },
    });

    return ok({
      paymentUrl: payment.confirmation?.confirmation_url ?? null,
      paymentId: payment.id,
    });
  } catch (error) {
    return serverError("payments.create", error);
  }
}
