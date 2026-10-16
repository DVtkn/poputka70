import { errors, ok, parseBody, serverError } from "@/lib/http";
import { tripQuoteSchema } from "@/lib/schemas";
import { quoteLeg } from "@/lib/trips";

/** Котировка отрезка: «сяду здесь, выйду там — сколько это». */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: tripId } = await context.params;
  if (!tripId) return errors.badRequest("Не указана поездка");

  const parsed = await parseBody(request, tripQuoteSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const result = await quoteLeg(tripId, parsed.data.pickupStopId ?? null, parsed.data.dropoffStopId ?? null);
    if (!result.ok) {
      return result.error === "Поездка не найдена"
        ? errors.notFound(result.error)
        : errors.conflict(result.error);
    }
    return ok({ quote: result.quote });
  } catch (error) {
    return serverError("trips.quote", error);
  }
}
