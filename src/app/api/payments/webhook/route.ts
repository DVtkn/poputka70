import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/yookassa";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-yookassa-signature");

    if (process.env.NODE_ENV === "production" || process.env.YOOKASSA_SECRET_KEY) {
      if (!process.env.YOOKASSA_SECRET_KEY) {
        console.error("YOOKASSA_SECRET_KEY not set in production — refusing webhook");
        return NextResponse.json({ error: "Webhook disabled" }, { status: 503 });
      }
      if (!signature || !verifyWebhookSignature(body, signature)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    } else {
      console.warn("YOOKASSA_SECRET_KEY is not set, skipping signature verification (dev mode)");
    }

    const event = JSON.parse(body);

    if (event.event === "payment.succeeded") {
      const payment = event.object;
      const bookingId = payment.metadata?.bookingId;

      if (!bookingId) {
        return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
      }

      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      const paidAmount = Number(payment.amount?.value);
      // Сумма приходит в рублях с копейками, ожидаем exact-совпадение с сервисным сбором.
      if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - booking.serviceFeeAmount) > 0.01) {
        console.error(`Payment amount mismatch for booking ${bookingId}: expected ${booking.serviceFeeAmount}, got ${paidAmount}`);
        return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        if (booking.serviceFeeStatus !== "PAID") {
          await tx.booking.update({
            where: { id: bookingId },
            data: {
              serviceFeeStatus: "PAID",
              paymentReference: booking.paymentReference || payment.id,
            },
          });

          await tx.notification.create({
            data: {
              userId: booking.passengerId,
              type: "PAYMENT_SUCCEEDED",
              title: "Оплата прошла успешно",
              body: `Сервисный сбор за бронирование оплачен (${booking.serviceFeeAmount} ₽).`,
              relatedEntityId: bookingId,
            },
          });
        }
      });
    } else if (event.event === "payment.canceled") {
      const payment = event.object;
      const bookingId = payment.metadata?.bookingId;

      if (bookingId) {
        await prisma.booking.update({
          where: { id: bookingId, serviceFeeStatus: "PENDING" },
          data: { serviceFeeStatus: "PENDING" },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("YooKassa webhook error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}