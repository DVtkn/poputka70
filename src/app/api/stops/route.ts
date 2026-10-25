import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ok, parseQuery, serverError } from "@/lib/http";
import { stopsQuerySchema } from "@/lib/schemas";
import { normalizeStopName, approxDistanceKm } from "@/lib/stops";

interface Suggestion {
  id: string;
  name: string;
  address: string | null;
  isPopular: boolean;
  kind: "stop" | "point";
  lat: number;
  lng: number;
}

/**
 * Автодополнение для поиска: транспортные остановки (справочник, 768)
 * и ключевые ориентиры-точки маршрутов (вузы, вокзал, БЦ — 15 закреплённых).
 * Популярные — первыми; дубли названий склеиваются.
 * При передаче lat/lng — сортировка по реальному расстоянию от координат пользователя.
 */
export async function GET(request: Request) {
  const parsed = parseQuery(request, stopsQuerySchema);
  if (!parsed.ok) return parsed.response;

  const { query, limit, lat, lng } = parsed.data;
  const normalized = normalizeStopName(query);
  const searching = normalized.length >= 2;
  const hasCoordinates = typeof lat === "number" && typeof lng === "number";

  try {
    const stopWhere: Prisma.StopWhereInput = {
      ...(hasCoordinates
        ? {
            lat: { gte: lat - 0.15, lte: lat + 0.15 },
            lng: { gte: lng - 0.25, lte: lng + 0.25 },
          }
        : {}),
      ...(searching
        ? {
            OR: [
              { nameNormalized: { contains: normalized } },
              { address: { contains: normalized, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const pointWhere: Prisma.CityPointWhereInput | undefined = searching
      ? {
          name: { contains: normalized, mode: "insensitive" },
          ...(hasCoordinates
            ? {
                lat: { gte: lat - 0.15, lte: lat + 0.15 },
                lng: { gte: lng - 0.25, lte: lng + 0.25 },
              }
            : {}),
        }
      : hasCoordinates
      ? {
          lat: { gte: lat - 0.15, lte: lat + 0.15 },
          lng: { gte: lng - 0.25, lte: lng + 0.25 },
        }
      : undefined;

    const [stops, points] = await Promise.all([
      prisma.stop.findMany({
        where: stopWhere,
        orderBy: hasCoordinates ? undefined : [{ isPopular: "desc" }, { name: "asc" }],
        take: hasCoordinates ? 80 : limit * 3,
        select: { id: true, name: true, address: true, isPopular: true, lat: true, lng: true },
      }),
      searching || hasCoordinates
        ? prisma.cityPoint.findMany({
            where: pointWhere,
            take: 6,
            select: { id: true, name: true, lat: true, lng: true },
          })
        : prisma.cityPoint.findMany({
            take: 6,
            orderBy: { name: "asc" },
            select: { id: true, name: true, lat: true, lng: true },
          }),
    ]);

    const seen = new Set<string>();
    const suggestions: Suggestion[] = [];

    // Сначала настоящие остановки (у них достоверные координаты),
    // ориентиры добавляем только если остановки с таким названием нет
    for (const stop of stops) {
      const key = `stop:${normalizeStopName(stop.name)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push({
        id: stop.id,
        name: stop.name,
        address: stop.address,
        isPopular: stop.isPopular,
        kind: "stop",
        lat: stop.lat,
        lng: stop.lng,
      });
    }

    for (const point of points) {
      const key = `point:${normalizeStopName(point.name)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push({
        id: point.id,
        name: point.name,
        address: null,
        isPopular: true,
        kind: "point",
        lat: point.lat,
        lng: point.lng,
      });
    }

    if (hasCoordinates) {
      suggestions.sort((a, b) => {
        const distA = approxDistanceKm(lat, lng, a.lat, a.lng);
        const distB = approxDistanceKm(lat, lng, b.lat, b.lng);
        return distA - distB;
      });
    } else {
      suggestions.sort((a, b) => {
        if (a.isPopular !== b.isPopular) return a.isPopular ? -1 : 1;
        return a.name.localeCompare(b.name, "ru");
      });
    }

    const result = suggestions.slice(0, limit);
    return ok(
      { count: result.length, stops: result },
      200,
      {
        "Cache-Control": hasCoordinates
          ? "private, no-cache"
          : "public, s-maxage=3600, stale-while-revalidate=86400",
      }
    );
  } catch (error) {
    return serverError("stops", error);
  }
}
