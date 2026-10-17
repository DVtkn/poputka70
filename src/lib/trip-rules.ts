import { addDaysUtc, dayOfWeekUtc } from "@/lib/time";
import type { GeoPoint } from "@/lib/geo";

/** Чистые правила поездок — без зависимостей от БД (удобно тестировать). */

export interface TripRouteSnapshot {
  driverId: string;
  originName: string;
  destName: string;
  origin: GeoPoint;
  dest: GeoPoint;
  price: number;
  seatsTotal: number;
  comment: string | null;
}

export interface TripLike {
  driverId: string | null;
  originName: string | null;
  destName: string | null;
  originLat: number | null;
  originLng: number | null;
  destLat: number | null;
  destLng: number | null;
  price: number | null;
  seatsTotal: number | null;
  comment: string | null;
  routeTemplate?: {
    driverId: string;
    price: number;
    seats: number;
    notes: string | null;
    origin: { name: string; lat: number; lng: number };
    destination: { name: string; lat: number; lng: number };
  } | null;
}

/** Единый резолвер маршрута поездки: снимок публикации, иначе — шаблон серии. */
export function tripRoute(trip: TripLike): TripRouteSnapshot | null {
  if (
    trip.driverId &&
    trip.originName &&
    trip.destName &&
    trip.originLat !== null &&
    trip.originLng !== null &&
    trip.destLat !== null &&
    trip.destLng !== null
  ) {
    return {
      driverId: trip.driverId,
      originName: trip.originName,
      destName: trip.destName,
      origin: { lat: trip.originLat, lng: trip.originLng },
      dest: { lat: trip.destLat, lng: trip.destLng },
      price: trip.price ?? 0,
      seatsTotal: trip.seatsTotal ?? 0,
      comment: trip.comment,
    };
  }

  const template = trip.routeTemplate;
  if (template) {
    return {
      driverId: template.driverId,
      originName: template.origin.name,
      destName: template.destination.name,
      origin: { lat: template.origin.lat, lng: template.origin.lng },
      dest: { lat: template.destination.lat, lng: template.destination.lng },
      price: template.price,
      seatsTotal: template.seats,
      comment: trip.comment ?? template.notes ?? null,
    };
  }

  return null;
}

export const CORRIDOR_RADIUS_KM = 0.7;

/** Цена за отрезок: доля от цены полного маршрута, минимум 50 ₽, округление до 10 ₽. */
export function legPrice(fullPrice: number, fullKm: number, legKm: number): number {
  if (fullPrice <= 0) return 0;
  const share = fullKm > 0 ? Math.min(1, Math.max(0.15, legKm / fullKm)) : 1;
  const raw = fullPrice * share;
  return Math.min(Math.max(Math.round(raw / 10) * 10, Math.min(50, fullPrice)), fullPrice);
}

export type TripRepeat = "none" | "weekdays" | "weekends" | "daily";

const REPEAT_HORIZON_DAYS = 14;

/** Даты публикации: разовая или серия на две недели вперёд. */
export function publicationDates(startDate: Date, repeat: TripRepeat): Date[] {
  if (repeat === "none") return [startDate];

  const dates: Date[] = [];
  for (let offset = 0; offset < REPEAT_HORIZON_DAYS; offset++) {
    const date = addDaysUtc(startDate, offset);
    const dayOfWeek = dayOfWeekUtc(date);
    const isWeekend = dayOfWeek >= 6;
    if (repeat === "daily") dates.push(date);
    else if (repeat === "weekdays" && !isWeekend) dates.push(date);
    else if (repeat === "weekends" && isWeekend) dates.push(date);
  }
  return dates;
}
