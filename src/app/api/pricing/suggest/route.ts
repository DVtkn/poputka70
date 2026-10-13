import { prisma } from "@/lib/prisma";
import { errors, ok, parseQuery, serverError } from "@/lib/http";
import { pricingSuggestQuerySchema } from "@/lib/schemas";
import { calculateCompensation, calculateServiceFee, calculateTotal, getDistanceKm, getPricingVersion } from "@/lib/pricing";
import { rateLimitByIp } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const limited = rateLimitByIp(request, "pricing:suggest", 30, 60 * 1000);
  if (!limited.allowed) return errors.rateLimited(limited.retryAfterSec);

  const parsed = parseQuery(request, pricingSuggestQuerySchema);
  if (!parsed.ok) return parsed.response;

  const { originId, destId } = parsed.data;

  try {
    const [origin, dest] = await Promise.all([
      prisma.cityPoint.findUnique({ where: { id: originId }, select: { lat: true, lng: true } }),
      prisma.cityPoint.findUnique({ where: { id: destId }, select: { lat: true, lng: true } }),
    ]);

    if (!origin || !dest) {
      return errors.notFound("Точки не найдены");
    }

    const distanceKm = await getDistanceKm(origin.lat, origin.lng, dest.lat, dest.lng);
    const compensation = calculateCompensation(distanceKm, "08:00");
    const serviceFee = calculateServiceFee(compensation);
    const total = calculateTotal(compensation);

    return ok({
      pricing: {
        distanceKm,
        compensation,
        serviceFee,
        total,
        pricingVersion: getPricingVersion(),
      },
    });
  } catch (error) {
    return serverError("pricing.suggest", error);
  }
}
