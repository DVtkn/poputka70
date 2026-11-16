import { prisma } from "@/lib/prisma";
import { tripRoute, tripRouteSelect } from "@/lib/trips";
import { cancelBooking } from "@/lib/bookings";
import { createNotificationPayload, sendNotificationToUser } from "@/lib/push";
import { formatTomskTime } from "@/lib/time";
import {
  formatBookingRequestDriverHtml,
  formatBookingDecisionDriverHtml,
  formatBookingDecisionPassengerHtml,
} from "./formatters";
import {
  sendTelegramMessage,
  editTelegramMessage,
  answerTelegramCallback,
} from "./telegram-client";
import type { TelegramCallbackQuery, TelegramInlineKeyboardMarkup } from "./types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://poputka70.vercel.app";

/**
 * Отправка водителю уведомления о новой заявке через Telegram.
 * Если autoAccept = true: информационная карточка с кнопкой перехода в рейс.
 * Если autoAccept = false: карточка с inline-кнопками «Одобрить» / «Отклонить».
 */
export async function sendBookingRequestToDriver(bookingId: string): Promise<boolean> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        tripId: true,
        pickupName: true,
        dropoffName: true,
        amountDue: true,
        compensationAmount: true,
        note: true,
        autoAccepted: true,
        passenger: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            ratingAsPassenger: true,
          },
        },
        trip: {
          select: {
            id: true,
            departureTime: true,
            ...tripRouteSelect,
            driver: {
              select: {
                id: true,
                telegramId: true,
                firstName: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    const driverTelegramId = booking?.trip?.driver?.telegramId;
    if (!booking || !driverTelegramId) {
      return false;
    }

    const route = tripRoute(booking.trip);
    const originName = route?.originName || booking.trip.originName || "Томск";
    const destName = route?.destName || booking.trip.destName || "Томск";
    const amount = booking.amountDue ?? booking.compensationAmount ?? 0;
    const passengerName = [booking.passenger.firstName, booking.passenger.lastName]
      .filter(Boolean)
      .join(" ");

    const text = formatBookingRequestDriverHtml({
      originName,
      destName,
      departureTime: booking.trip.departureTime,
      passengerName,
      passengerRating: booking.passenger.ratingAsPassenger,
      passengerPhone: booking.passenger.phone,
      pickupName: booking.pickupName,
      dropoffName: booking.dropoffName,
      amount,
      note: booking.note,
      autoAccepted: booking.autoAccepted,
    });

    const tripWebUrl = `${APP_URL}/trips/${encodeURIComponent(booking.tripId)}`;

    let replyMarkup: TelegramInlineKeyboardMarkup;
    if (booking.autoAccepted) {
      replyMarkup = {
        inline_keyboard: [
          [
            {
              text: "🚗 Открыть поездку",
              web_app: { url: tripWebUrl },
            },
          ],
        ],
      };
    } else {
      replyMarkup = {
        inline_keyboard: [
          [
            { text: "✅ Одобрить", callback_data: `b:acc:${booking.id}` },
            { text: "❌ Отклонить", callback_data: `b:dec:${booking.id}` },
          ],
          [
            {
              text: "🚗 Открыть поездку",
              web_app: { url: tripWebUrl },
            },
          ],
        ],
      };
    }

    return await sendTelegramMessage(driverTelegramId, text, {
      reply_markup: replyMarkup,
    });
  } catch (error) {
    console.error("[sendBookingRequestToDriver] error:", error);
    return false;
  }
}

/**
 * Отправка пассажиру уведомления о решении водителя через Telegram (если у пассажира привязан telegramId).
 */
export async function sendPassengerBookingDecisionTelegram(
  bookingId: string,
  status: "CONFIRMED" | "CANCELLED"
): Promise<boolean> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        tripId: true,
        pickupName: true,
        dropoffName: true,
        passenger: {
          select: {
            id: true,
            telegramId: true,
            firstName: true,
          },
        },
        trip: {
          select: {
            id: true,
            departureTime: true,
            ...tripRouteSelect,
            driver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                driverProfile: {
                  select: {
                    carModel: true,
                    carColor: true,
                    carNumber: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const passengerTelegramId = booking?.passenger?.telegramId;
    if (!booking || !passengerTelegramId) {
      return false;
    }

    const route = tripRoute(booking.trip);
    const originName = route?.originName || booking.trip.originName || "Томск";
    const destName = route?.destName || booking.trip.destName || "Томск";
    const driver = booking.trip.driver;
    const driverName = driver
      ? [driver.firstName, driver.lastName].filter(Boolean).join(" ")
      : "Водитель";

    const { text, actionUrl } = formatBookingDecisionPassengerHtml({
      originName,
      destName,
      departureTime: booking.trip.departureTime,
      driverName,
      driverPhone: status === "CONFIRMED" ? driver?.phone : null,
      carModel: driver?.driverProfile?.carModel,
      carColor: driver?.driverProfile?.carColor,
      carNumber: driver?.driverProfile?.carNumber,
      pickupName: booking.pickupName,
      dropoffName: booking.dropoffName,
      status,
      appUrl: APP_URL,
      tripId: booking.tripId,
      bookingId: booking.id,
    });

    const buttonText = status === "CONFIRMED" ? "🎫 Мой билет" : "🔍 Найти поездку";
    const replyMarkup: TelegramInlineKeyboardMarkup = {
      inline_keyboard: [
        [
          {
            text: buttonText,
            web_app: { url: actionUrl },
          },
        ],
      ],
    };

    return await sendTelegramMessage(passengerTelegramId, text, {
      reply_markup: replyMarkup,
    });
  } catch (error) {
    console.error("[sendPassengerBookingDecisionTelegram] error:", error);
    return false;
  }
}

/**
 * Обработка callback query от inline-кнопок одобрения/отклонения брони водителем.
 */
export async function handleBookingCallback(
  query: TelegramCallbackQuery,
  action: "acc" | "dec",
  bookingId: string
): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      tripId: true,
      passengerId: true,
      status: true,
      pickupName: true,
      dropoffName: true,
      amountDue: true,
      compensationAmount: true,
      passenger: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          telegramId: true,
          ratingAsPassenger: true,
        },
      },
      trip: {
        select: {
          id: true,
          departureTime: true,
          ...tripRouteSelect,
          driver: {
            select: {
              id: true,
              telegramId: true,
              firstName: true,
              lastName: true,
              phone: true,
              driverProfile: {
                select: {
                  carModel: true,
                  carColor: true,
                  carNumber: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!booking) {
    await answerTelegramCallback(query.id, "Заявка не найдена", true);
    return;
  }

  const driver = booking.trip.driver;
  const callerTgId = query.from?.id != null ? String(query.from.id) : null;

  // Проверка прав: действие доступно только водителю этой поездки
  if (!driver || !driver.telegramId || callerTgId !== driver.telegramId) {
    await answerTelegramCallback(
      query.id,
      "Это действие доступно только водителю этой поездки",
      true
    );
    return;
  }

  const route = tripRoute(booking.trip);
  const originName = route?.originName || booking.trip.originName || "Томск";
  const destName = route?.destName || booking.trip.destName || "Томск";
  const passengerName = [booking.passenger.firstName, booking.passenger.lastName]
    .filter(Boolean)
    .join(" ");

  const tripWebUrl = `${APP_URL}/trips/${encodeURIComponent(booking.tripId)}`;

  // Идемпотентность: если статус уже изменен ранее
  if (booking.status !== "PENDING") {
    await answerTelegramCallback(query.id, "Заявка уже обработана", false);

    if (query.message?.chat.id && query.message.message_id) {
      const isConfirmed = booking.status === "CONFIRMED";
      const statusText = formatBookingDecisionDriverHtml({
        originName,
        destName,
        departureTime: booking.trip.departureTime,
        passengerName,
        passengerPhone: isConfirmed ? booking.passenger.phone : null,
        pickupName: booking.pickupName,
        dropoffName: booking.dropoffName,
        status: isConfirmed ? "CONFIRMED" : "CANCELLED",
      });

      await editTelegramMessage(query.message.chat.id, query.message.message_id, statusText, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🚗 Открыть поездку",
                web_app: { url: tripWebUrl },
              },
            ],
          ],
        },
      });
    }
    return;
  }

  if (action === "acc") {
    // CAS обновление: статус PENDING -> CONFIRMED
    const updated = await prisma.booking.updateMany({
      where: { id: bookingId, status: "PENDING" },
      data: { status: "CONFIRMED", phonesVisibleAt: new Date() },
    });

    if (updated.count === 0) {
      await answerTelegramCallback(query.id, "Заявка уже обработана", false);
      return;
    }

    await answerTelegramCallback(query.id, "Заявка одобрена!");

    if (query.message?.chat.id && query.message.message_id) {
      const driverCardText = formatBookingDecisionDriverHtml({
        originName,
        destName,
        departureTime: booking.trip.departureTime,
        passengerName,
        passengerPhone: booking.passenger.phone,
        pickupName: booking.pickupName,
        dropoffName: booking.dropoffName,
        status: "CONFIRMED",
      });

      await editTelegramMessage(query.message.chat.id, query.message.message_id, driverCardText, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🚗 Открыть поездку",
                web_app: { url: tripWebUrl },
              },
            ],
          ],
        },
      });
    }

    // In-app уведомление и Web Push пассажиру
    const title = "Тебя приняли";
    const body = `${originName} → ${destName}, ${formatTomskTime(booking.trip.departureTime)}. Водитель ждёт тебя${
      booking.pickupName ? ` на остановке «${booking.pickupName}»` : ""
    }.`;

    await prisma.notification
      .create({
        data: {
          userId: booking.passengerId,
          type: "BOOKING_ACCEPTED",
          title,
          body,
          relatedEntityId: bookingId,
        },
      })
      .catch(() => 0);

    await sendNotificationToUser(
      booking.passengerId,
      createNotificationPayload(title, body, { url: "/profile/bookings" })
    ).catch(() => 0);

    // Уведомление в Telegram пассажиру
    if (booking.passenger.telegramId) {
      await sendPassengerBookingDecisionTelegram(bookingId, "CONFIRMED").catch(() => 0);
    }
    return;
  }

  if (action === "dec") {
    // Отклонение через cancelBooking: возврат места (+1), статус CANCELLED
    const result = await cancelBooking(bookingId, "DRIVER", new Date(), {
      bodyOverride: `Поездка ${originName} → ${destName}: водитель не смог взять тебя в этот раз.`,
    });

    if (!result.cancelled) {
      await answerTelegramCallback(query.id, "Заявка уже обработана", false);
      return;
    }

    await answerTelegramCallback(query.id, "Заявка отклонена");

    if (query.message?.chat.id && query.message.message_id) {
      const driverCardText = formatBookingDecisionDriverHtml({
        originName,
        destName,
        departureTime: booking.trip.departureTime,
        passengerName,
        pickupName: booking.pickupName,
        dropoffName: booking.dropoffName,
        status: "CANCELLED",
      });

      await editTelegramMessage(query.message.chat.id, query.message.message_id, driverCardText, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🚗 Открыть поездку",
                web_app: { url: tripWebUrl },
              },
            ],
          ],
        },
      });
    }

    // Уведомление в Telegram пассажиру
    if (booking.passenger.telegramId) {
      await sendPassengerBookingDecisionTelegram(bookingId, "CANCELLED").catch(() => 0);
    }
  }
}
