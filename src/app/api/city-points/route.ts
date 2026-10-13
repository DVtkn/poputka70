import { prisma } from "@/lib/prisma";
import { ok, parseQuery, serverError } from "@/lib/http";
import { cityPointsQuerySchema } from "@/lib/schemas";

export async function GET(request: Request) {
  const parsed = parseQuery(request, cityPointsQuerySchema);
  if (!parsed.ok) return parsed.response;

  const { type, category } = parsed.data;

  try {
    const points = await prisma.cityPoint.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(category ? { category } : {}),
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        type: true,
        category: true,
        lat: true,
        lng: true,
        description: true,
      },
    });

    return ok({ count: points.length, points });
  } catch (error) {
    return serverError("city-points", error);
  }
}
