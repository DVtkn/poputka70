import registryData from "../../data/tomsk-route-registry.json";
import { prisma } from "@/lib/prisma";
import { approxDistanceKm, normalizeStopName } from "@/lib/stops";
import { segmentLengthKm, projectOnSegment, type GeoPoint } from "@/lib/geo";

interface RegistryEntry {
  label: string;
  transport: string | null;
  directionTitle: string;
  stops: string[];
}

const REGISTRY = registryData as RegistryEntry[];

/** Главные транспортные хабы Томска для склейки маршрутов (Уровень 2). */
export const TOMSK_HUBS = [
  "Площадь Южная",
  "Лагерный сад",
  "ТГУ",
  "Главпочтамт",
  "Площадь Ленина",
  "Площадь Кирова",
  "Пушкинская развязка",
  "ЦУМ",
  "Изумрудный город",
  "Комсомольский пр.",
  "ДК Авангард",
];

interface RegistryPath {
  label: string;
  transport: string | null;
  stops: string[];
}

export interface RouteStopPoint {
  name: string;
  lat: number;
  lng: number;
  orderIndex: number;
  isOrigin: boolean;
  isDest: boolean;
  distanceFromOriginMeters: number;
  arrivalTimeOffsetMin: number;
}

function indexOf(haystack: string[], needle: string): number {
  const target = normalizeStopName(needle);
  let fallback = -1;
  for (let i = 0; i < haystack.length; i++) {
    const current = normalizeStopName(haystack[i]);
    if (current === target) return i;
    if (fallback < 0 && (current.includes(target) || target.includes(current))) fallback = i;
  }
  return fallback;
}

/** Шаг 1: Прямой поиск в реестре маршрутов. */
export function findRegistryPath(originName: string, destName: string): RegistryPath | null {
  let best: RegistryPath | null = null;
  let bestLength = Number.POSITIVE_INFINITY;

  for (const entry of REGISTRY) {
    const originIndex = indexOf(entry.stops, originName);
    if (originIndex < 0) continue;
    const destIndex = indexOf(entry.stops, destName);
    if (destIndex <= originIndex) continue;

    const length = destIndex - originIndex;
    if (length < bestLength) {
      bestLength = length;
      best = {
        label: entry.label,
        transport: entry.transport,
        stops: entry.stops.slice(originIndex, destIndex + 1),
      };
    }
  }

  return best;
}

/** Шаг 2: Графовая склейка через транспортные хабы Томска. */
export function findPathViaHubs(originName: string, destName: string): RegistryPath | null {
  let best: RegistryPath | null = null;
  let bestTotalLength = Number.POSITIVE_INFINITY;

  for (const hub of TOMSK_HUBS) {
    const path1 = findRegistryPath(originName, hub);
    if (!path1) continue;

    const path2 = findRegistryPath(hub, destName);
    if (!path2) continue;

    const totalLength = path1.stops.length + path2.stops.length - 1; // -1 because hub is duplicated
    if (totalLength < bestTotalLength) {
      bestTotalLength = totalLength;
      best = {
        label: `${path1.label} + ${path2.label}`,
        transport: path1.transport ?? path2.transport,
        stops: [...path1.stops, ...path2.stops.slice(1)], // склеиваем без дублирования хаба
      };
    }
  }

  return best;
}

/** Шаг 3: OSRM-полилиния с буфером 100 м (гео-фолбэк). */
export async function findPathViaOSRM(
  origin: GeoPoint,
  dest: GeoPoint
): Promise<{ stops: RouteStopPoint[]; totalKm: number } | null> {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=false`,
      {
        headers: { "User-Agent": "Poputka70/1.0" },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const meters = data.routes?.[0]?.distance;
    if (data.code !== "Ok" || typeof meters !== "number") return null;

    const totalKm = Math.round((meters / 1000) * 10) / 10;

    // Находим все остановки в радиусе 100 м от линии origin→dest
    const latPad = 0.1 / 111; // 100 м в градусах широты
    const lngPad = 0.1 / (111 * Math.max(0.2, Math.cos((origin.lat * Math.PI) / 180)));

    const stops = await prisma.stop.findMany({
      where: {
        lat: { gte: Math.min(origin.lat, dest.lat) - latPad, lte: Math.max(origin.lat, dest.lat) + latPad },
        lng: { gte: Math.min(origin.lng, dest.lng) - lngPad, lte: Math.max(origin.lng, dest.lng) + lngPad },
      },
      select: { name: true, lat: true, lng: true },
    });

    const result: RouteStopPoint[] = [];
    const seen = new Set<string>();

    for (const stop of stops) {
      const key = normalizeStopName(stop.name);
      if (seen.has(key)) continue;

      const projection = projectOnSegment({ lat: stop.lat, lng: stop.lng }, origin, dest);
      if (projection.distanceKm > 0.1) continue; // буфер 100 м

      seen.add(key);
      result.push({
        name: stop.name,
        lat: stop.lat,
        lng: stop.lng,
        orderIndex: 0, // будет пересчитано при сортировке
        isOrigin: false,
        isDest: false,
        distanceFromOriginMeters: Math.round(projection.fraction * totalKm * 1000),
        arrivalTimeOffsetMin: Math.round(projection.fraction * totalKm * 2), // ~2 мин/км
      });
    }

    // Сортируем по проекции (прогрессу от старта)
    result.sort((a, b) => a.distanceFromOriginMeters - b.distanceFromOriginMeters);

    // Пересчитываем orderIndex
    for (let i = 0; i < result.length; i++) {
      result[i].orderIndex = i;
    }

    return { stops: result, totalKm };
  } catch {
    return null;
  }
}

/**
 * Единая точка входа: строит упорядоченный список остановок маршрута
 * по трехступенчатому алгоритму (Waterfall).
 */
export async function buildRouteStops(
  originName: string,
  destName: string,
  origin: GeoPoint,
  dest: GeoPoint
): Promise<{ stops: RouteStopPoint[]; routeNumber: string | null; totalKm: number } | null> {
  // Шаг 1: Прямой маршрут из реестра
  const direct = findRegistryPath(originName, destName);
  if (direct) {
    const stops = await loadStopCoordinates(direct.stops, origin, dest);
    if (stops) {
      return {
        stops,
        routeNumber: direct.label,
        totalKm: stops[stops.length - 1].distanceFromOriginMeters / 1000,
      };
    }
  }

  // Шаг 2: Склейка через хабы
  const viaHubs = findPathViaHubs(originName, destName);
  if (viaHubs) {
    const stops = await loadStopCoordinates(viaHubs.stops, origin, dest);
    if (stops) {
      return {
        stops,
        routeNumber: viaHubs.label,
        totalKm: stops[stops.length - 1].distanceFromOriginMeters / 1000,
      };
    }
  }

  // Шаг 3: OSRM-полилиния с буфером 100 м
  const osrm = await findPathViaOSRM(origin, dest);
  if (osrm && osrm.stops.length > 0) {
    return {
      stops: osrm.stops,
      routeNumber: null,
      totalKm: osrm.totalKm,
    };
  }

  return null;
}

/** Загружает координаты остановок по именам и вычисляет дистанции/тайминги. */
async function loadStopCoordinates(
  stopNames: string[],
  origin: GeoPoint,
  dest: GeoPoint
): Promise<RouteStopPoint[] | null> {
  const normalized = [...new Set(stopNames.map((name) => normalizeStopName(name)))];
  const found = await prisma.stop.findMany({
    where: { nameNormalized: { in: normalized } },
    select: { name: true, nameNormalized: true, lat: true, lng: true },
  });

  const byName = new Map<string, { lat: number; lng: number }[]>();
  for (const stop of found) {
    const list = byName.get(stop.nameNormalized) ?? [];
    list.push({ lat: stop.lat, lng: stop.lng });
    byName.set(stop.nameNormalized, list);
  }

  const result: RouteStopPoint[] = [];
  let previous: GeoPoint | null = origin;
  let cumulativeMeters = 0;

  for (let i = 0; i < stopNames.length; i++) {
    const name = stopNames[i];
    const candidates = byName.get(normalizeStopName(name)) ?? [];
    let best: { lat: number; lng: number } | null = null;

    for (const candidate of candidates) {
      if (!previous) {
        best = candidate;
        break;
      }
      const distance = approxDistanceKm(previous.lat, previous.lng, candidate.lat, candidate.lng);
      if (!best || distance < approxDistanceKm(previous.lat, previous.lng, best.lat, best.lng)) {
        best = candidate;
      }
    }

    if (!best) continue;

    if (previous) {
      cumulativeMeters += approxDistanceKm(previous.lat, previous.lng, best.lat, best.lng) * 1000;
    }
    previous = best;

    result.push({
      name,
      lat: best.lat,
      lng: best.lng,
      orderIndex: result.length,
      isOrigin: i === 0,
      isDest: i === stopNames.length - 1,
      distanceFromOriginMeters: Math.round(cumulativeMeters),
      arrivalTimeOffsetMin: Math.round(cumulativeMeters / 1000 * 2), // ~2 мин/км
    });
  }

  return result.length > 0 ? result : null;
}
