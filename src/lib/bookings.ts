import { prisma } from "@/lib/prisma";
import { cancelPayment, isYooKassaConfigured, refundPayment } from "@/lib/yookassa";
import { tripRoute } from "@/lib/trip-rules";

export type CancelInitiator = "PASSENGER" | "DRIVER" | "SYSTEM" | "EXPIRED";

/** Статусы рейса, в которых можно бронировать места. */
export const ACTIVE_TRIP_STATUSES = ["SCHEDULED", "CONFIRMED"] as const;

/** Сколько минут даётся на оплату сервисного сбора после брони. */
export const PAYMENT_WINDOW_MINUTES = 30;

/** За сколько минут до отправления пассажир может отменить бронь. */
export const CANCEL_CUTOFF_MINUTES = 60;

export interface CancelBookingOptions {
  /** Свой текст уведомления пассажиру (например, при отмене поездки водителем). */
  bodyOverride?: string;
}

export interface CancelBookingResult {
  cancelled: boolean;
  refunded: boolean;
}

/**
 * Отмена брони: атомарный CAS-перевод в CANCELLED с возвратом места ровно один раз.
 * Если сервисный сбор был оплачен — пытаемся оформить возврат в YooKassa
 * (когда интеграция настроена). Повторный вызов — no-op.
 */
export async function cancelBooking(
  bookingId: string,
  initiatedBy: CancelInitiator,
  now: Date = new Date(),
  options: CancelBookingOptions = {}
): Promise<CancelBookingResult> {
  const booking = await prisma.$transaction(async (tx) => {
    const updated = await tx.booking.updateMany({
      where: { id: bookingId, status: { in: ["PENDING", "CONFIRMED"] } },
      data: { status: "CANCELLED", cancelledAt: now, cancelInitiator: initiatedBy },
    });
    if (updated.count === 0) return null;

    const current = await tx.booking.findUnique({
      where: { id: bookingId },
      select: {
        tripId: true,
        passengerId: true,
        serviceFeeAmount: true,
        serviceFeeStatus: true,
        paymentReference: true,
        trip: {
          select: {
            driverId: true,
            originName: true,
            destName: true,
            originLat: true,
            originLng: true,
            destLat: true,
            destLng: true,
            price: true,
            seatsTotal: true,
            comment: true,
            routeTemplate: {
              select: {
                driverId: true,
                price: true,
                seats: true,
                notes: true,
                origin: { select: { name: true, lat: true, lng: true } },
                destination: { select: { name: true, lat: true, lng: true } },
              },
            },
          },
        },
      },
    });
    if (!current) return null;

    await tx.trip.updateMany({
      where: { id: current.tripId },
      data: { availableSeats: { increment: 1 } },
    });

    return current;
  });

  if (!booking) return { cancelled: false, refunded: false };

  let refunded = false;
  const wasPaid = booking.serviceFeeStatus === "PAID";

  // Неоплаченную бронь закрываем вместе с её платёжной сессией, чтобы нельзя было заплатить «в пустоту»
  if (!wasPaid && booking.paymentReference && isYooKassaConfigured()) {
    try {
      await cancelPayment(booking.paymentReference);
    } catch (error) {
      console.error(`[booking:${bookingId}] не удалось закрыть платёжную сессию`, error);
    }
  }

  if (wasPaid && booking.paymentReference && isYooKassaConfigured()) {
    try {
      await refundPayment(
        booking.paymentReference,
        { value: booking.serviceFeeAmount.toFixed(2), currency: "RUB" },
        `refund-${bookingId}`
      );
      await prisma.booking.update({
        where: { id: bookingId },
        data: { serviceFeeStatus: "REFUNDED" },
      });
      refunded = true;
    } catch (error) {
      console.error(`[booking:${bookingId}] refund failed`, error);
      // Возврат не прошёл — оставляем задачу для поддержки (никто не должен потерять деньги молча)
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: "REFUND_MANUAL",
            title: "Нужен ручной возврат",
            body: `Возврат по брони ${bookingId} не прошёл — оформи вручную в ЮKassa.`,
            relatedEntityId: bookingId,
          })),
        });
      }
    }
  }

  const tripRouteInfo = tripRoute(booking.trip);
  const route = tripRouteInfo ? `${tripRouteInfo.originName} → ${tripRouteInfo.destName}` : "Поездка";
  const refundNote =
    wasPaid && refunded
      ? " Сервисный сбор возвращён на карту."
      : wasPaid
        ? " Возврат сервисного сбора оформит поддержка."
        : "";
  const body = options.bodyOverride
    ? `${options.bodyOverride}${refundNote}`
    : `Бронь на поездку ${route} отменена.${refundNote}`;

  await prisma.notification.create({
    data: {
      userId: booking.passengerId,
      type: "BOOKING_CANCELLED",
      title: "Бронь отменена",
      body,
      relatedEntityId: bookingId,
    },
  });

  return { cancelled: true, refunded };
}

/** Ленивая зачистка: снимает просроченные неоплаченные брони конкретной поездки. */
export async function expireOverdueBookingsForTrip(
  tripId: string,
  now: Date = new Date()
): Promise<number> {
  const overdue = await prisma.booking.findMany({
    where: {
      tripId,
      status: "PENDING",
      serviceFeeStatus: "PENDING",
      paymentDeadline: { lte: now },
    },
    select: { id: true },
  });

  let expired = 0;
  for (const booking of overdue) {
    const result = await cancelBooking(booking.id, "EXPIRED", now);
    if (result.cancelled) expired += 1;
  }
  return expired;
}
