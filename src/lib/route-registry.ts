import registryData from "../../data/tomsk-route-registry.json";
import { prisma } from "@/lib/prisma";
import { normalizeStopName } from "@/lib/stops";

interface RegistryEntry {
  label: string;
  transport: string | null;
  directionTitle: string;
  stops: string[];
}

const REGISTRY = registryData as RegistryEntry[];

export interface RoutePath {
  label: string;
  transport: string | null;
  stops: string[];
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

/** Ищет в реестре маршрутов отрезок, содержащий обе остановки в правильном порядке. */
export function findRegistryPath(originName: string, destName: string): RoutePath | null {
  let best: RoutePath | null = null;
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

export interface RoutePoint {
  name: string;
  lat: number | null;
  lng: number | null;
}

/** Подтягивает координаты остановок из справочника (для карты). */
export async function pathWithCoordinates(stops: string[]): Promise<RoutePoint[]> {
  const normalized = [...new Set(stops.map((name) => normalizeStopName(name)))];
  const found = await prisma.stop.findMany({
    where: { nameNormalized: { in: normalized } },
    select: { name: true, nameNormalized: true, lat: true, lng: true },
  });

  const byName = new Map<string, { lat: number; lng: number }>();
  for (const stop of found) {
    if (!byName.has(stop.nameNormalized)) {
      byName.set(stop.nameNormalized, { lat: stop.lat, lng: stop.lng });
    }
  }

  return stops.map((name) => {
    const coords = byName.get(normalizeStopName(name));
    return { name, lat: coords?.lat ?? null, lng: coords?.lng ?? null };
  });
}
