import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPayment, isYooKassaConfigured } from "@/lib/yookassa";
import { cancelBooking } from "@/lib/bookings";

interface YooKassaWebhookEvent {
  event?: string;
  object?: { id?: string };
}

export async function POST(request: Request) {
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

    // Единственный надёжный способ проверки уведомления ЮKassa —
    // перезапросить платёж по API и доверять только его данным.
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

      const updated = await prisma.booking.updateMany({
        where: { id: bookingId, serviceFeeStatus: "PENDING" },
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
    // YooKassa ретраит при не-200, поэтому логируем и отвечаем 200.
    // Платёж можно будет разобрать вручную через админку YooKassa.
    console.error("[payments.webhook] ошибка обработки:", error);
    return NextResponse.json({ success: true });
  }
}
