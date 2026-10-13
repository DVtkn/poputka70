import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPayment, isYooKassaConfigured, refundPayment } from "@/lib/yookassa";
import { cancelBooking } from "@/lib/bookings";
import { serverError } from "@/lib/http";
import { rateLimitByIp } from "@/lib/rate-limit";

interface YooKassaWebhookEvent {
  event?: string;
  object?: { id?: string };
}

export async function POST(request: Request) {
  // Публичный эндпоинт: защищаем магазин от внешнего трафика (запрос к API ЮKassa на каждый POST)
  const limited = rateLimitByIp(request, "payments:webhook", 60, 60 * 1000);
  if (!limited.allowed) return NextResponse.json({ success: true });

  try {
    const body = await request.text();

    let event: YooKassaWebhookEvent;
    try {
      event = JSON.parse(body) as YooKassaWebhookEvent;
    } catch {
      return NextResponse.json({ success: true });
    }

    const paymentId = event.object?.id;
    if (!paymentId) return NextResponse.json({ success: true });

    if (!isYooKassaConfigured()) {
      console.warn("[payments.webhook] YooKassa не настроена, событие пропущено");
      return NextResponse.json({ success: true });
    }

    // Единственный надёжный способ проверки уведомления ЮKassa — перезапросить платёж
    // и доверять только данным API (подписи у ЮKassa нет).
    const payment = await getPayment(paymentId);
    const bookingId = payment.metadata?.bookingId;
    if (!bookingId) return NextResponse.json({ success: true });

    if (payment.status === "succeeded") {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, passengerId: true, serviceFeeAmount: true },
      });
      if (!booking) return NextResponse.json({ success: true });

      const paidAmount = Number(payment.amount.value);
      if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - booking.serviceFeeAmount) > 0.01) {
        console.error(
          `[payments.webhook] сумма не совпала для ${bookingId}: ожидали ${booking.serviceFeeAmount}, получили ${paidAmount}`
        );
        return NextResponse.json({ success: true });
      }

      // Оплата помечается только у активной брони
      const updated = await prisma.booking.updateMany({
        where: {
          id: bookingId,
          serviceFeeStatus: "PENDING",
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        data: { serviceFeeStatus: "PAID", paymentReference: payment.id },
      });

      if (updated.count > 0) {
        await prisma.notification.create({
          data: {
            userId: booking.passengerId,
            type: "PAYMENT_SUCCEEDED",
            title: "Оплата прошла",
            body: `Сервисный сбор ${booking.serviceFeeAmount} ₽ оплачен.`,
            relatedEntityId: bookingId,
          },
        });
        return NextResponse.json({ success: true });
      }

      // Бронь уже не активна, а деньги списались — возвращаем автоматически
      const current = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { status: true, serviceFeeStatus: true },
      });
      if (current && current.serviceFeeStatus !== "PAID" && current.serviceFeeStatus !== "REFUNDED") {
        try {
          await refundPayment(
            payment.id,
            { value: booking.serviceFeeAmount.toFixed(2), currency: "RUB" },
            `refund-${bookingId}`
          );
          await prisma.booking.update({
            where: { id: bookingId },
            data: { serviceFeeStatus: "REFUNDED" },
          });
          await prisma.notification.create({
            data: {
              userId: booking.passengerId,
              type: "PAYMENT_REFUNDED",
              title: "Оплата возвращена",
              body: `Бронь была отменена — сервисный сбор ${booking.serviceFeeAmount} ₽ возвращён.`,
              relatedEntityId: bookingId,
            },
          });
        } catch (error) {
          console.error(`[payments.webhook] автовозврат не удался для ${bookingId}`, error);
          await prisma.notification.create({
            data: {
              userId: booking.passengerId,
              type: "PAYMENT_REFUND_PENDING",
              title: "Возврат в обработке",
              body: "Оплата за отменённую бронь вернётся в течение нескольких дней. Если не вернётся — напиши в поддержку.",
              relatedEntityId: bookingId,
            },
          });
        }
      }

      return NextResponse.json({ success: true });
    }

    if (payment.status === "canceled") {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, status: true, serviceFeeStatus: true },
      });
      if (booking && booking.status === "PENDING" && booking.serviceFeeStatus === "PENDING") {
        await cancelBooking(bookingId, "SYSTEM");
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Возвращаем 5xx: ЮKassa повторит уведомление — корректность денег важнее «тишины»
    return serverError("payments.webhook", error);
  }
}
