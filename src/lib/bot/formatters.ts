import { formatTomskTime, tomskParts, tomskTodayUtc, addDaysUtc } from "@/lib/time";
import type { TripSearchItem } from "@/lib/trips";

/** Экранирование спецсимволов для HTML-режима Telegram */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Форматирование даты в человекочитаемый вид по томскому времени */
export function formatTripDateTomsk(date: Date, now: Date = new Date()): string {
  const parts = tomskParts(date);
  const nowParts = tomskParts(now);

  const isToday =
    parts.year === nowParts.year && parts.month === nowParts.month && parts.day === nowParts.day;

  const tomorrowParts = tomskParts(addDaysUtc(tomskTodayUtc(now), 1));
  const isTomorrow =
    parts.year === tomorrowParts.year &&
    parts.month === tomorrowParts.month &&
    parts.day === tomorrowParts.day;

  const timeStr = formatTomskTime(date);

  if (isToday) {
    return `Сегодня в ${timeStr}`;
  }
  if (isTomorrow) {
    return `Завтра в ${timeStr}`;
  }

  const dayStr = String(parts.day).padStart(2, "0");
  const monthStr = String(parts.month + 1).padStart(2, "0");
  return `${dayStr}.${monthStr} в ${timeStr}`;
}

/** Форматирование единичной карточки поездки */
export function formatTripCardHtml(trip: TripSearchItem, appUrl: string): {
  text: string;
  tripUrl: string;
} {
  const tripUrl = `${appUrl}/trips/${encodeURIComponent(trip.id)}`;
  const route = `🚗 <b>${escapeHtml(trip.originName)} → ${escapeHtml(trip.destName)}</b>`;
  const time = `🕒 <b>${formatTripDateTomsk(trip.departureTime)}</b> (по Томску)`;
  const seatsAndPrice = `💰 <b>${trip.legPrice} ₽</b> · 💺 <b>${trip.seatsLeft} из ${trip.seatsTotal} мест</b>`;

  const driverBadge = trip.driver.verified ? " ✓ (проверен)" : "";
  const driverLastName = trip.driver.lastName ? ` ${escapeHtml(trip.driver.lastName)}` : "";
  const driverName = `${escapeHtml(trip.driver.firstName)}${driverLastName}`;
  const rating = (trip.driver.ratingAsDriver ?? 5.0).toFixed(1);
  const car = trip.driver.carModel
    ? ` · ${escapeHtml(trip.driver.carModel)}${trip.driver.carColor ? ` (${escapeHtml(trip.driver.carColor)})` : ""}`
    : "";

  const driver = `👤 <b>${driverName}</b> (★ ${rating}${driverBadge})${car}`;
  const comment = trip.comment ? `💬 <i>«${escapeHtml(trip.comment)}»</i>` : "";

  const text = [route, time, seatsAndPrice, driver, comment].filter(Boolean).join("\n");

  return { text, tripUrl };
}

export interface BookingRequestDriverFormatParams {
  originName: string;
  destName: string;
  departureTime: Date;
  passengerName: string;
  passengerRating?: number | null;
  passengerPhone?: string | null;
  pickupName?: string | null;
  dropoffName?: string | null;
  amount: number;
  note?: string | null;
  autoAccepted?: boolean;
}

/** Карточка новой заявки на бронирование для чата водителя */
export function formatBookingRequestDriverHtml(params: BookingRequestDriverFormatParams): string {
  const header = params.autoAccepted
    ? "🚗 <b>Новый попутчик!</b> (подтверждено автоматически)"
    : "🚗 <b>Новая заявка на поездку!</b>";

  const route = `Маршрут: <b>${escapeHtml(params.originName)} → ${escapeHtml(params.destName)}</b>`;
  const time = `🕒 <b>${formatTripDateTomsk(params.departureTime)}</b> (по Томску)`;

  const ratingStr = params.passengerRating != null ? ` (★ ${params.passengerRating.toFixed(1)})` : "";
  const passenger = `👤 Пассажир: <b>${escapeHtml(params.passengerName)}</b>${ratingStr}`;

  const lines = [header, "", route, time, passenger];

  if (params.pickupName) {
    lines.push(`📍 Посадка: <b>${escapeHtml(params.pickupName)}</b>`);
  }
  if (params.dropoffName) {
    lines.push(`🏁 Высадка: <b>${escapeHtml(params.dropoffName)}</b>`);
  }
  if (params.amount > 0) {
    lines.push(`💰 Компенсация: <b>${params.amount} ₽</b>`);
  }
  if (params.passengerPhone && params.autoAccepted) {
    lines.push(`📞 Телефон: <b>${escapeHtml(params.passengerPhone)}</b>`);
  }
  if (params.note) {
    lines.push(`💬 Пожелание: <i>«${escapeHtml(params.note)}»</i>`);
  }

  if (!params.autoAccepted) {
    lines.push("");
    lines.push("Подтвердите или отклоните заявку кнопками ниже:");
  }

  return lines.join("\n");
}

export interface BookingDecisionDriverFormatParams {
  originName: string;
  destName: string;
  departureTime: Date;
  passengerName: string;
  passengerPhone?: string | null;
  pickupName?: string | null;
  dropoffName?: string | null;
  status: "CONFIRMED" | "CANCELLED" | "DECLINED";
}

/** Обновленная карточка в чате водителя после принятия решения */
export function formatBookingDecisionDriverHtml(params: BookingDecisionDriverFormatParams): string {
  const isConfirmed = params.status === "CONFIRMED";
  const header = isConfirmed ? "✅ <b>Заявка одобрена</b>" : "❌ <b>Заявка отклонена</b>";
  const route = `Маршрут: <b>${escapeHtml(params.originName)} → ${escapeHtml(params.destName)}</b>`;
  const time = `🕒 <b>${formatTripDateTomsk(params.departureTime)}</b> (по Томску)`;
  const passenger = `👤 Пассажир: <b>${escapeHtml(params.passengerName)}</b>`;

  const lines = [header, "", route, time, passenger];

  if (isConfirmed) {
    if (params.passengerPhone) {
      lines.push(`📞 Телефон пассажира: <b>${escapeHtml(params.passengerPhone)}</b>`);
    }
    if (params.pickupName) {
      lines.push(`📍 Посадка: <b>${escapeHtml(params.pickupName)}</b>`);
    }
    if (params.dropoffName) {
      lines.push(`🏁 Высадка: <b>${escapeHtml(params.dropoffName)}</b>`);
    }
    lines.push("");
    lines.push("Пассажир уведомлён. Договоритесь о деталях поездки.");
  } else {
    lines.push("");
    lines.push("Место возвращено в рейс. Заявка закрыта.");
  }

  return lines.join("\n");
}

export interface BookingDecisionPassengerFormatParams {
  originName: string;
  destName: string;
  departureTime: Date;
  driverName: string;
  driverPhone?: string | null;
  carModel?: string | null;
  carColor?: string | null;
  carNumber?: string | null;
  pickupName?: string | null;
  dropoffName?: string | null;
  status: "CONFIRMED" | "CANCELLED" | "DECLINED";
  appUrl: string;
  tripId: string;
  bookingId?: string;
}

/** Сообщение для пассажира в боте при подтверждении или отклонении заявки */
export function formatBookingDecisionPassengerHtml(params: BookingDecisionPassengerFormatParams): {
  text: string;
  actionUrl: string;
} {
  const isConfirmed = params.status === "CONFIRMED";
  const route = `Маршрут: <b>${escapeHtml(params.originName)} → ${escapeHtml(params.destName)}</b>`;
  const time = `🕒 <b>${formatTripDateTomsk(params.departureTime)}</b> (по Томску)`;

  if (isConfirmed) {
    const header = "🎉 <b>Ваша поездка подтверждена!</b>";
    const driver = `👤 Водитель: <b>${escapeHtml(params.driverName)}</b>`;
    const lines = [header, "", route, time, driver];

    if (params.driverPhone) {
      lines.push(`📞 Телефон водителя: <b>${escapeHtml(params.driverPhone)}</b>`);
    }

    if (params.carModel) {
      const color = params.carColor ? ` (${escapeHtml(params.carColor)})` : "";
      const number = params.carNumber ? `, госномер <b>${escapeHtml(params.carNumber)}</b>` : "";
      lines.push(`🚗 Автомобиль: <b>${escapeHtml(params.carModel)}</b>${color}${number}`);
    }

    if (params.pickupName) {
      lines.push(`📍 Место встречи: <b>${escapeHtml(params.pickupName)}</b>`);
    }
    if (params.dropoffName) {
      lines.push(`🏁 Высадка: <b>${escapeHtml(params.dropoffName)}</b>`);
    }

    lines.push("");
    lines.push("Пожалуйста, не опаздывайте к месту посадки.");

    const actionUrl = `${params.appUrl}/profile/bookings`;
    return { text: lines.join("\n"), actionUrl };
  } else {
    const header = "😔 <b>Водитель не смог подтвердить поездку</b>";
    const lines = [
      header,
      "",
      route,
      time,
      "",
      "К сожалению, водитель отклонил заявку или места закончились.",
      "Вы можете найти другой попутный автомобиль в поиске:",
    ];
    const actionUrl = `${params.appUrl}/search`;
    return { text: lines.join("\n"), actionUrl };
  }
}
