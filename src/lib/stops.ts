import { prisma } from "@/lib/prisma";

/** Нормализация названий остановок: «ё»→«е», нижний регистр, схлопнутые пробелы. */
export function normalizeStopName(name: string): string {
  return name.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

import { approxDistanceKm } from "@/lib/geo";
export { approxDistanceKm };

const NEAREST_POINT_RADIUS_KM = 2;

/**
 * Пока маршруты водителей привязаны к старым CityPoint (15 точек),
 * а поиск идёт по справочнику Stop (768): сопоставляем выбранную остановку
 * с CityPoint по нормализованному имени и по близости координат (≤ 2 км).
 * После перехода маршрутов на Stop (PRD, P1) эта прослойка уйдёт.
 */
export async function resolveEquivalentPointIds(input: string): Promise<string[]> {
  const normalized = normalizeStopName(input);
  if (normalized.length < 2) return [];

  const [stops, points] = await Promise.all([
    prisma.stop.findMany({
      where: { nameNormalized: { contains: normalized } },
      select: { lat: true, lng: true },
      take: 8,
    }),
    prisma.cityPoint.findMany({ select: { id: true, name: true, lat: true, lng: true } }),
  ]);

  const ids = new Set<string>();

  for (const point of points) {
    const pointName = normalizeStopName(point.name);
    if (
      pointName === normalized ||
      pointName.includes(normalized) ||
      normalized.includes(pointName)
    ) {
      ids.add(point.id);
    }
  }

  for (const stop of stops) {
    for (const point of points) {
      if (approxDistanceKm(stop.lat, stop.lng, point.lat, point.lng) <= NEAREST_POINT_RADIUS_KM) {
        ids.add(point.id);
      }
    }
  }

  return [...ids];
}
