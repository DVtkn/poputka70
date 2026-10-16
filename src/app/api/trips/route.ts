import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { errors, ok, parseBody, parseQuery, serverError } from "@/lib/http";
import { publishTripSchema, tripSearchQuerySchema } from "@/lib/schemas";
import { publishTrips, searchTrips, tripDriverSelect, tripRouteSelect } from "@/lib/trips";
import { segmentLengthKm } from "@/lib/geo";
import { tripRoute } from "@/lib/trip-rules";
import { rateLimitByUser } from "@/lib/rate-limit";
import { tomskTodayUtc } from "@/lib/time";

/** Поиск поездок по остановкам (коридор маршрута). Публичный. */
export async function GET(request: Request) {
  const parsed = parseQuery(request, tripSearchQuerySchema);
  if (!parsed.ok) return parsed.response;

  const { from, to, date, passengers, limit } = parsed.data;

  try {
    // Без пары точек — «живая лента»: ближайшие опубликованные поездки
    if (!from || !to) {
      const now = new Date();
      const upcoming = await prisma.trip.findMany({
        where: {
          date: { gte: tomskTodayUtc(now) },
          status: { in: ["CONFIRMED", "SCHEDULED", "PENDING_CONFIRMATION"] },
          departureTime: { gt: now },
          availableSeats: { gt: 0 },
        },
        select: {
          id: true,
          date: true,
          departureTime: true,
          availableSeats: true,
          ...tripRouteSelect,
          driver: { select: tripDriverSelect },
        },
        orderBy: { departureTime: "asc" },
        take: limit,
      });

      const feed = upcoming
        .map((trip) => {
          const route = tripRoute(trip);
          if (!route || !trip.driver) return null;
          const fullKm = Math.round(segmentLengthKm(route.origin, route.dest) * 10) / 10;
          return {
            id: trip.id,
            date: trip.date,
            departureTime: trip.departureTime,
            originName: route.originName,
            destName: route.destName,
            priceFull: route.price,
            legPrice: route.price,
            legKm: fullKm,
            seatsLeft: trip.availableSeats,
            seatsTotal: route.seatsTotal,
            comment: route.comment,
            driver: {
              id: trip.driver.id,
              firstName: trip.driver.firstName,
              lastName: trip.driver.lastName,
              ratingAsDriver: trip.driver.ratingAsDriver ?? 5,
              verified: Boolean(trip.driver.maxVerifiedAt),
              carModel: trip.driver.driverProfile?.carModel ?? null,
              carColor: trip.driver.driverProfile?.carColor ?? null,
            },
          };
        })
        .filter((item) => item !== null);

      return ok({ count: feed.length, trips: feed });
    }

    const trips = await searchTrips({ from, to, date, passengers, limit });
    return ok({ count: trips.length, trips });
  } catch (error) {
    return serverError("trips.search", error);
  }
}

/** Публикация поездки (или серии на две недели): «Подвезти». */
export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  const parsed = await parseBody(request, publishTripSchema);
  if (!parsed.ok) return parsed.response;

  const { origin, dest, date, time, seats, price, comment, repeat } = parsed.data;

  const limited = rateLimitByUser("trips:publish", sessionUser.id, 10, 60 * 60 * 1000);
  if (!limited.allowed) return errors.rateLimited(limited.retryAfterSec);

  try {
    const profile = await prisma.driverProfile.findUnique({
      where: { userId: sessionUser.id },
      select: { id: true },
    });
    if (!profile) {
      return errors.forbidden("Сначала расскажи о машине в кабинете водителя");
    }

    const startDate = new Date(`${date}T00:00:00.000Z`);
    const today = tomskTodayUtc();
    if (startDate.getTime() < today.getTime()) {
      return errors.badRequest("Эта дата уже прошла — выбери сегодня или позже");
    }

    const { created } = await publishTrips({
      driverId: sessionUser.id,
      originName: origin.name,
      destName: dest.name,
      origin: { lat: origin.lat, lng: origin.lng },
      dest: { lat: dest.lat, lng: dest.lng },
      date: startDate,
      time,
      seats,
      price,
      comment,
      repeat,
    });

    return ok({ created });
  } catch (error) {
    return serverError("trips.publish", error);
  }
}
