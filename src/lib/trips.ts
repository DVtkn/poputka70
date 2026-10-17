import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { projectOnSegment, segmentLengthKm, type GeoPoint } from "@/lib/geo";
import { normalizeStopName, approxDistanceKm } from "@/lib/stops";
import { buildRouteStops } from "@/lib/route-registry";
import { instantFromTomsk, tomskTodayUtc } from "@/lib/time";
import {
  CORRIDOR_RADIUS_KM,
  legPrice,
  publicationDates,
  tripRoute,
  type TripRepeat,
  type TripRouteSnapshot,
} from "@/lib/trip-rules";

export { tripRoute } from "@/lib/trip-rules";
export type { TripRepeat, TripRouteSnapshot } from "@/lib/trip-rules";

export const tripTemplateInclude = {
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
} as const;

/** Общий select: снимок маршрута + шаблон серии (для tripRoute). */
export const tripRouteSelect = {
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
  ...tripTemplateInclude,
} as const;


export const tripDriverSelect = {
  id: true,
  firstName: true,
  lastName: true,
  ratingAsDriver: true,
  maxVerifiedAt: true,
  driverProfile: { select: { carModel: true, carColor: true } },
} as const;

export interface CorridorStop {
  id: string;
  name: string;
  address: string | null;
  fraction: number;
  distanceKm: number;
  lat: number;
  lng: number;
}

/** Остановки «по пути»: в пределах 700 м от линии A→B, в порядке следования. */
export async function corridorStops(route: TripRouteSnapshot): Promise<CorridorStop[]> {
  const latPad = CORRIDOR_RADIUS_KM / 111;
  const lngPad = CORRIDOR_RADIUS_KM / (111 * Math.max(0.2, Math.cos((route.origin.lat * Math.PI) / 180)));

  const stops = await prisma.stop.findMany({
    where: {
      lat: { gte: Math.min(route.origin.lat, route.dest.lat) - latPad, lte: Math.max(route.origin.lat, route.dest.lat) + latPad },
      lng: { gte: Math.min(route.origin.lng, route.dest.lng) - lngPad, lte: Math.max(route.origin.lng, route.dest.lng) + lngPad },
    },
    select: { id: true, name: true, address: true, lat: true, lng: true },
  });

  const seen = new Set<string>();
  const result: CorridorStop[] = [];

  for (const stop of stops) {
    const key = normalizeStopName(stop.name);
    if (seen.has(key)) continue;

    const projection = projectOnSegment(stop, route.origin, route.dest);
    if (projection.distanceKm > CORRIDOR_RADIUS_KM) continue;

    seen.add(key);
    result.push({
      id: stop.id,
      name: stop.name,
      address: stop.address,
      fraction: projection.fraction,
      distanceKm: projection.distanceKm,
      lat: stop.lat,
      lng: stop.lng,
    });
  }

  return result.sort((a, b) => a.fraction - b.fraction);
}


export interface LegQuote {
  pickupStopId: string | null;
  dropoffStopId: string | null;
  pickupName: string;
  dropoffName: string;
  amount: number;
  distanceKm: number;
}

/** Считает отрезок поездки и его цену. Без остановок — весь маршрут. */
export async function quoteLeg(
  tripId: string,
  pickupStopId?: string | null,
  dropoffStopId?: string | null
): Promise<{ ok: true; quote: LegQuote } | { ok: false; error: string }> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: tripTemplateInclude,
  });
  if (!trip) return { ok: false, error: "Поездка не найдена" };

  const route = tripRoute(trip);
  if (!route) return { ok: false, error: "Маршрут поездки не определён" };

  const fullKm = segmentLengthKm(route.origin, route.dest);

  let pickupName = route.originName;
  let dropoffName = route.destName;
  let pickupFraction = 0;
  let dropoffFraction = 1;

  if (pickupStopId || dropoffStopId) {
    const stops = await corridorStops(route);

    if (pickupStopId) {
      const pickup = stops.find((stop) => stop.id === pickupStopId);
      if (!pickup) return { ok: false, error: "Эта остановка не по пути" };
      pickupName = pickup.name;
      pickupFraction = pickup.fraction;
    }
    if (dropoffStopId) {
      const dropoff = stops.find((stop) => stop.id === dropoffStopId);
      if (!dropoff) return { ok: false, error: "Эта остановка не по пути" };
      dropoffName = dropoff.name;
      dropoffFraction = dropoff.fraction;
    }
    if (dropoffFraction <= pickupFraction) {
      return { ok: false, error: "Выход должен быть дальше посадки" };
    }
  }

  const legKm = Math.max(0.1, (dropoffFraction - pickupFraction) * fullKm);
  return {
    ok: true,
    quote: {
      pickupStopId: pickupStopId ?? null,
      dropoffStopId: dropoffStopId ?? null,
      pickupName,
      dropoffName,
      amount: legPrice(route.price, fullKm, legKm),
      distanceKm: Math.round(legKm * 10) / 10,
    },
  };
}


export interface PublishTripInput {
  driverId: string;
  originName: string;
  viaName?: string | null;
  destName: string;
  origin: GeoPoint;
  via?: GeoPoint | null;
  dest: GeoPoint;
  date: Date;
  time: string;
  seats: number;
  price: number;
  comment?: string;
  repeat: TripRepeat;
  autoAccept?: boolean;
}

/** Публикация поездки (или серии) — поездки сразу попадают в ленту. */
export async function publishTrips(
  input: PublishTripInput
): Promise<{ created: number; tripIds: string[]; existingTripId: string | null }> {
  const dates = publicationDates(input.date, input.repeat);
  const tripIds: string[] = [];
  let existingTripId: string | null = null;

  // Строим упорядоченный список остановок маршрута по 3-ступенчатому алгоритму
  const viaParam =
    input.viaName && input.via ? { name: input.viaName, point: input.via } : null;
  const route = await buildRouteStops(
    input.originName,
    input.destName,
    { lat: input.origin.lat, lng: input.origin.lng },
    { lat: input.dest.lat, lng: input.dest.lng },
    viaParam
  );
  const routeStops = route?.stops ?? null;
  const routeNumber = route?.routeNumber ?? null;

  for (const date of dates) {
    const departureTime = instantFromTomsk(date, input.time);

    // Не плодим дубли: та же поездка того же водителя в то же время уже есть
    const existing = await prisma.trip.findFirst({
      where: {
        driverId: input.driverId,
        originName: input.originName,
        destName: input.destName,
        departureTime,
      },
      select: { id: true },
    });
    if (existing) {
      existingTripId ??= existing.id;
      continue;
    }

    const trip = await prisma.trip.create({
      data: {
        routeTemplateId: null,
        driverId: input.driverId,
        originName: input.originName,
        destName: input.destName,
        originLat: input.origin.lat,
        originLng: input.origin.lng,
        destLat: input.dest.lat,
        destLng: input.dest.lng,
        date,
        departureTime,
        status: "SCHEDULED",
        autoAccept: input.autoAccept ?? true,
        repeatType: input.repeat === "none" ? "NONE" : input.repeat === "weekdays" ? "WEEKDAYS" : input.repeat === "weekends" ? "WEEKENDS" : "DAILY",
        availableSeats: input.seats,
        seatsTotal: input.seats,
        price: input.price,
        comment: input.comment?.trim() || null,
        routeStops: routeStops ? (routeStops as unknown as Prisma.InputJsonValue) : undefined,
        routeNumber,
      },
      select: { id: true },
    });
    tripIds.push(trip.id);
  }

  return { created: tripIds.length, tripIds, existingTripId };
}

/** Начало сегодняшнего дня по Томску (для фильтров ленты). */
export function todayTomsk(): Date {
  return tomskTodayUtc();
}

/** Ищет координаты по названию точки: сначала остановки, затем базовые точки. */
export async function resolveGeoPointByName(
  name: string
): Promise<{ name: string; lat: number; lng: number } | null> {
  const normalized = normalizeStopName(name);
  if (normalized.length < 2) return null;

  const stops = await prisma.stop.findMany({
    where: { nameNormalized: { contains: normalized } },
    take: 10,
    select: { name: true, nameNormalized: true, isPopular: true, lat: true, lng: true },
  });

  if (stops.length > 0) {
    const best =
      stops.find((stop) => stop.nameNormalized === normalized) ??
      stops.find((stop) => stop.isPopular) ??
      stops[0];
    return { name: best.name, lat: best.lat, lng: best.lng };
  }

  const point = await prisma.cityPoint.findFirst({
    where: { name: { contains: name, mode: "insensitive" } },
    select: { name: true, lat: true, lng: true },
  });
  if (point) return { name: point.name, lat: point.lat, lng: point.lng };

  return null;
}

export interface TripSearchItem {
  id: string;
  date: Date;
  departureTime: Date;
  originName: string;
  destName: string;
  priceFull: number;
  legPrice: number;
  legKm: number;
  seatsLeft: number;
  seatsTotal: number;
  comment: string | null;
  driver: {
    id: string;
    firstName: string;
    lastName: string | null;
    ratingAsDriver: number;
    verified: boolean;
    carModel: string | null;
    carColor: string | null;
  };
}

export interface TripsSearchInput {
  from: string;
  to: string;
  date?: string;
  passengers: number;
  limit: number;
  now?: Date;
}

/** Поиск поездок по коридору: обе точки должны быть «по пути» и в правильном порядке. */
export async function searchTrips(input: TripsSearchInput): Promise<TripSearchItem[]> {
  const [fromPoint, toPoint] = await Promise.all([
    resolveGeoPointByName(input.from),
    resolveGeoPointByName(input.to),
  ]);
  if (!fromPoint || !toPoint) return [];

  const now = input.now ?? new Date();
  const today = tomskTodayUtc(now);

  const trips = await prisma.trip.findMany({
    where: {
      date: input.date ? { equals: new Date(`${input.date}T00:00:00.000Z`) } : { gte: today },
      status: { in: ["CONFIRMED", "SCHEDULED"] },
      availableSeats: { gte: input.passengers },
      departureTime: { gt: now },
    },
    include: {
      ...tripTemplateInclude,
      driver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          ratingAsDriver: true,
          maxVerifiedAt: true,
          driverProfile: { select: { carModel: true, carColor: true } },
        },
      },
    },
    orderBy: { departureTime: "asc" },
    take: 300,
  });

  const results: TripSearchItem[] = [];

  for (const trip of trips) {
    const route = tripRoute(trip);
    if (!route) continue;

    const driver = trip.driver;
    if (!driver) continue;

    const fullKm = segmentLengthKm(route.origin, route.dest);
    let isMatch = false;
    let legKm = fullKm;

    // 1. Поиск по фактическому массиву routeStops (с учетом поворотов и улиц города)
    const routeStopsList = Array.isArray(trip.routeStops)
      ? (trip.routeStops as unknown as Array<{ name: string; lat: number; lng: number }>)
      : null;

    if (routeStopsList && routeStopsList.length >= 2) {
      let bestFromIdx = -1;
      let bestFromDist = Infinity;
      let bestToIdx = -1;
      let bestToDist = Infinity;

      routeStopsList.forEach((stop, idx) => {
        if (typeof stop.lat === "number" && typeof stop.lng === "number") {
          const dFrom = approxDistanceKm(fromPoint.lat, fromPoint.lng, stop.lat, stop.lng);
          if (dFrom < bestFromDist) {
            bestFromDist = dFrom;
            bestFromIdx = idx;
          }
          const dTo = approxDistanceKm(toPoint.lat, toPoint.lng, stop.lat, stop.lng);
          if (dTo < bestToDist) {
            bestToDist = dTo;
            bestToIdx = idx;
          }
        }
      });

      // Пешая доступность до остановки <= 800 м и правильный порядок движения
      if (bestFromDist <= 0.8 && bestToDist <= 0.8 && bestFromIdx < bestToIdx) {
        isMatch = true;
        const fraction = (bestToIdx - bestFromIdx) / (routeStopsList.length - 1);
        legKm = Math.max(0.1, fraction * fullKm);
      }
    }

    // 2. Фолбэк: поиск по коридору прямой хорды (для поездок без снимка routeStops)
    if (!isMatch) {
      const fromProjection = projectOnSegment(fromPoint, route.origin, route.dest);
      const toProjection = projectOnSegment(toPoint, route.origin, route.dest);

      if (
        fromProjection.distanceKm <= CORRIDOR_RADIUS_KM &&
        toProjection.distanceKm <= CORRIDOR_RADIUS_KM &&
        toProjection.fraction > fromProjection.fraction
      ) {
        isMatch = true;
        legKm = Math.max(0.1, (toProjection.fraction - fromProjection.fraction) * fullKm);
      }
    }

    if (!isMatch) continue;

    results.push({
      id: trip.id,
      date: trip.date,
      departureTime: trip.departureTime,
      originName: route.originName,
      destName: route.destName,
      priceFull: route.price,
      legPrice: legPrice(route.price, fullKm, legKm),
      legKm: Math.round(legKm * 10) / 10,
      seatsLeft: trip.availableSeats,
      seatsTotal: route.seatsTotal,
      comment: route.comment,
      driver: {
        id: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        ratingAsDriver: driver.ratingAsDriver ?? 5,
        verified: Boolean(driver.maxVerifiedAt),
        carModel: driver.driverProfile?.carModel ?? null,
        carColor: driver.driverProfile?.carColor ?? null,
      },
    });

    if (results.length >= input.limit) break;
  }

  return results;
}
