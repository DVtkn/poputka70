import { formatTomskTime, tomskParts } from "@/lib/time";
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
export function formatTripDateTomsk(date: Date): string {
  const parts = tomskParts(date);
  const now = tomskParts(new Date());

  const isToday =
    parts.year === now.year && parts.month === now.month && parts.day === now.day;

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tomorrowParts = tomskParts(tomorrow);
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
  const tripUrl = `${appUrl}/trips/${trip.id}`;
  const route = `🚗 <b>${escapeHtml(trip.originName)} → ${escapeHtml(trip.destName)}</b>`;
  const time = `🕒 <b>${formatTripDateTomsk(trip.departureTime)}</b> (Томское время)`;
  const seats = `💺 Мест: <b>${trip.seatsLeft} из ${trip.seatsTotal}</b>`;
  const price = `💰 Цена: <b>${trip.legPrice} ₽</b>`;

  const driverBadge = trip.driver.verified ? " ✓ (верен)" : "";
  const driverName = escapeHtml(trip.driver.firstName);
  const rating = trip.driver.ratingAsDriver.toFixed(1);
  const car = trip.driver.carModel
    ? ` · ${escapeHtml(trip.driver.carModel)}${trip.driver.carColor ? ` (${escapeHtml(trip.driver.carColor)})` : ""}`
    : "";

  const driver = `👤 Водитель: <b>${driverName}</b> (★ ${rating}${driverBadge})${car}`;
  const comment = trip.comment ? `\n💬 <i>«${escapeHtml(trip.comment)}»</i>` : "";

  const text = [route, time, seats, price, driver, comment].filter(Boolean).join("\n");

  return { text, tripUrl };
}
