import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { createPayment } from "@/lib/yookassa";

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Не авторизован" }, { status: 401 });
    }

    const { bookingId } = await request.json();
    if (!bookingId) {
      return NextResponse.json({ success: false, error: "Не указано бронирование" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        trip: {
          include: {
            routeTemplate: {
              select: { origin: true, destination: true, driverId: true },
            },
          },
        },
        passenger: { select: { id: true, firstName: true, lastName: true, login: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: "Бронирование не найдено" }, { status: 404 });
    }

    if (booking.passengerId !== sessionUser.id) {
      return NextResponse.json({ success: false, error: "Не твоё бронирование" }, { status: 403 });
    }

    if (booking.serviceFeeStatus === "PAID") {
      return NextResponse.json({ success: false, error: "Уже оплачено" }, { status: 400 });
    }

    if (!booking.offerAccepted) {
      return NextResponse.json({ success: false, error: "Не принята оферта" }, { status: 400 });
    }

    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/profile/bookings?paid=${booking.id}`;
    const customerEmail = booking.passenger.login?.includes("@")
      ? booking.passenger.login
      : `${booking.passenger.id.slice(0, 8)}@poputka70.ru`;

    const payment = await createPayment({
      amount: { value: booking.serviceFeeAmount.toFixed(2), currency: "RUB" },
      confirmation: { type: "redirect", return_url: returnUrl },
      capture: true,
      description: `Сервисный сбор Попутка70: ${booking.trip.routeTemplate.origin.name} → ${booking.trip.routeTemplate.destination.name}`,
      metadata: { bookingId: booking.id, type: "service_fee" },
      receipt: {
        customer: { email: customerEmail },
        items: [
          {
            description: "Сервисный сбор за бронирование места",
            quantity: "1",
            amount: { value: booking.serviceFeeAmount.toFixed(2), currency: "RUB" },
            vat_code: 1,
            payment_mode: "full_payment",
            payment_subject: "service",
          },
        ],
      },
    });

    await prisma.booking.update({
      where: { id: bookingId },
      data: { paymentReference: payment.id },
    });

    return NextResponse.json({
      success: true,
      paymentUrl: payment.confirmation.confirmation_url,
      paymentId: payment.id,
    });
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json({ success: false, error: "Ошибка создания платежа" }, { status: 500 });
  }
}