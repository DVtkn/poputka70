import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { errors, ok, serverError } from "@/lib/http";
import { tripRoute } from "@/lib/trip-rules";
import { tripRouteSelect } from "@/lib/trips";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  const { id: tripId } = await context.params;
  if (!tripId) return errors.badRequest("Не указана поездка");

  try {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        status: true,
        ...tripRouteSelect,
      },
    });

    if (!trip) return errors.notFound("Поездка не найдена");
    const route = tripRoute(trip);
    const driverId = route?.driverId ?? trip.driverId;
    if (!driverId || driverId !== sessionUser.id) {
      return errors.forbidden("Это не твоя поездка");
    }
    if (trip.status !== "SCHEDULED") {
      return errors.conflict("Поездку нельзя подтвердить в текущем статусе");
    }

    const updated = await prisma.trip.updateMany({
      where: { id: tripId, status: "SCHEDULED" },
      data: { status: "CONFIRMED" },
    });
    if (updated.count === 0) {
      return errors.conflict("Поездка уже подтверждена");
    }

    return ok({ confirmed: true });
  } catch (error) {
    return serverError("trips.confirm", error);
  }
}
