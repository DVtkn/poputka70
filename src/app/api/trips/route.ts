import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { errors, ok, parseBody, parseQuery, serverError } from "@/lib/http";
import { publishTripSchema, tripSearchQuerySchema } from "@/lib/schemas";
import { publishTrips, searchTrips, tripDriverSelect, tripRouteSelect } from "@/lib/trips";
import { segmentLengthKm } from "@/lib/geo";
import { tripRoute } from "@/lib/trip-rules";
import { rateLimitByUser } from "@/lib/rate-limit";
import { tomskTodayUtc } from "@/lib/time";
import { sweepTripStatuses } from "@/lib/maintenance";
import { createNotificationPayload, sendNotificationToUser } from "@/lib/push";

/** Поиск поездок по остановкам (коридор маршрута). Публичный. */
export async function GET(request: Request) {
  const parsed = parseQuery(request, tripSearchQuerySchema);
  if (!parsed.ok) return parsed.response;

  const { from, to, date, passengers, limit } = parsed.data;

  try {
    await sweepTripStatuses();

    // Без пары точек — «живая лента»: ближайшие опубликованные поездки
    if (!from || !to) {
      const now = new Date();
      const upcoming = await prisma.trip.findMany({
        where: {
          date: { gte: tomskTodayUtc(now) },
          status: { in: ["CONFIRMED", "SCHEDULED"] },
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

  const { origin, via, dest, date, time, seats, price, comment, repeat, autoAccept } = parsed.data;

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

    const samePoint =
      Math.abs(origin.lat - dest.lat) < 1e-5 && Math.abs(origin.lng - dest.lng) < 1e-5;
    const tooClose = segmentLengthKm(origin, dest) < 0.2;
    if (samePoint || tooClose) {
      return errors.badRequest("Точки слишком близко друг к другу — выбери разные остановки");
    }

    const startDate = new Date(`${date}T00:00:00.000Z`);
    const today = tomskTodayUtc();
    if (startDate.getTime() < today.getTime()) {
      return errors.badRequest("Эта дата уже прошла — выбери сегодня или позже");
    }

    const { created, tripIds, existingTripId } = await publishTrips({
      driverId: sessionUser.id,
      originName: origin.name,
      viaName: via?.name ?? null,
      destName: dest.name,
      origin: { lat: origin.lat, lng: origin.lng },
      via: via ? { lat: via.lat, lng: via.lng } : null,
      dest: { lat: dest.lat, lng: dest.lng },
      date: startDate,
      time,
      seats,
      price,
      comment,
      repeat,
      autoAccept,
    });

    // Матчинг спроса (DemandRequest): оповещаем ожидающих пассажиров
    if (tripIds.length > 0) {
      try {
        const firstTrip = await prisma.trip.findUnique({
          where: { id: tripIds[0] },
          select: { id: true, routeStops: true },
        });

        if (firstTrip) {
          const routeStopsList = Array.isArray(firstTrip.routeStops)
            ? (firstTrip.routeStops as Array<{ name: string }>)
            : [];
          const stopNames = new Set(routeStopsList.map((s) => s.name.toLowerCase()));
          stopNames.add(origin.name.toLowerCase());
          stopNames.add(dest.name.toLowerCase());
          if (via?.name) stopNames.add(via.name.toLowerCase());

          const openDemands = await prisma.demandRequest.findMany({
            where: {
              status: "OPEN",
              date: startDate,
            },
            include: {
              fromStop: { select: { name: true } },
              toStop: { select: { name: true } },
            },
            take: 20,
          });

          for (const demand of openDemands) {
            const matchFrom = stopNames.has(demand.fromStop.name.toLowerCase());
            const matchTo = stopNames.has(demand.toStop.name.toLowerCase());
            if (matchFrom && matchTo) {
              await prisma.demandRequest.update({
                where: { id: demand.id },
                data: { status: "MATCHED", matchedTripId: firstTrip.id },
              });

              const title = "Появилась машина по твоему маршруту!";
              const body = `${origin.name} → ${dest.name} в ${time}. Успей занять место!`;

              await prisma.notification.create({
                data: {
                  userId: demand.passengerId,
                  type: "DEMAND_MATCHED",
                  title,
                  body,
                  relatedEntityId: firstTrip.id,
                },
              });

              await sendNotificationToUser(
                demand.passengerId,
                createNotificationPayload(title, body, { url: `/trips/${firstTrip.id}` })
              ).catch(() => 0);
            }
          }
        }
      } catch (demandErr) {
        console.error("[trips.publish.demandMatch] ошибка матчинга спроса:", demandErr);
      }
    }

    return ok({ created, firstTripId: tripIds[0] ?? existingTripId ?? null });
  } catch (error) {
    return serverError("trips.publish", error);
  }
}
