import { prisma } from "@/lib/prisma";
import { ok, parseQuery, serverError } from "@/lib/http";
import { stopsQuerySchema } from "@/lib/schemas";
import { normalizeStopName } from "@/lib/stops";

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
 */
export async function GET(request: Request) {
  const parsed = parseQuery(request, stopsQuerySchema);
  if (!parsed.ok) return parsed.response;

  const { query, limit } = parsed.data;
  const normalized = normalizeStopName(query);
  const searching = normalized.length >= 2;

  try {
    const [stops, points] = await Promise.all([
      prisma.stop.findMany({
        where: searching
          ? {
              OR: [
                { nameNormalized: { contains: normalized } },
                { address: { contains: normalized, mode: "insensitive" } },
              ],
            }
          : {},
        orderBy: [{ isPopular: "desc" }, { name: "asc" }],
        take: limit * 3,
        select: { id: true, name: true, address: true, isPopular: true, lat: true, lng: true },
      }),
      searching
        ? prisma.cityPoint.findMany({
            where: { name: { contains: normalized, mode: "insensitive" } },
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

    suggestions.sort((a, b) => {
      if (a.isPopular !== b.isPopular) return a.isPopular ? -1 : 1;
      return a.name.localeCompare(b.name, "ru");
    });

    const result = suggestions.slice(0, limit);
    return ok({ count: result.length, stops: result });
  } catch (error) {
    return serverError("stops", error);
  }
}
