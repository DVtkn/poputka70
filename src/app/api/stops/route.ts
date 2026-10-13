import { prisma } from "@/lib/prisma";
import { ok, parseQuery, serverError } from "@/lib/http";
import { stopsQuerySchema } from "@/lib/schemas";
import { normalizeStopName } from "@/lib/stops";

/**
 * Автодополнение остановок: популярные — первыми, затем совпадения по названию и адресу.
 * Публичный справочник, личные данные не возвращаются.
 */
export async function GET(request: Request) {
  const parsed = parseQuery(request, stopsQuerySchema);
  if (!parsed.ok) return parsed.response;

  const { query, limit } = parsed.data;
  const normalized = normalizeStopName(query);

  try {
    const stops = await prisma.stop.findMany({
      where:
        normalized.length >= 2
          ? {
              OR: [
                { nameNormalized: { contains: normalized } },
                { address: { contains: normalized, mode: "insensitive" } },
              ],
            }
          : {},
      orderBy: [{ isPopular: "desc" }, { name: "asc" }],
      take: limit,
      select: { id: true, name: true, address: true, isPopular: true, lat: true, lng: true },
    });

    return ok({ count: stops.length, stops });
  } catch (error) {
    return serverError("stops", error);
  }
}
