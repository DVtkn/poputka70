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
