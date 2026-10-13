import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { errors, ok, parseBody, parseQuery, serverError } from "@/lib/http";
import { routeCreateSchema, routesQuerySchema } from "@/lib/schemas";
import { ACTIVE_TRIP_STATUSES } from "@/lib/bookings";
import { PRICING_CONFIG } from "@/lib/pricing";
import { tomskTodayUtc } from "@/lib/time";
import { resolveEquivalentPointIds } from "@/lib/stops";
import { rateLimitByUser } from "@/lib/rate-limit";

const DAY_NAMES: Record<number, string> = {
  1: "Пн",
  2: "Вт",
  3: "Ср",
  4: "Чт",
  5: "Пт",
  6: "Сб",
  7: "Вс",
};

export async function GET(request: Request) {
  const parsed = parseQuery(request, routesQuerySchema);
  if (!parsed.ok) return parsed.response;

  const { from, to, date, passengers } = parsed.data;
  const today = tomskTodayUtc();

  try {
    const where: Prisma.RouteTemplateWhereInput = { active: true };

    // Поиск идёт по справочнику остановок (768), а маршруты пока привязаны к CityPoint:
    // сопоставляем выбранные остановки с ближайшими точками маршрутов.
    const [fromIds, toIds] = await Promise.all([
      from ? resolveEquivalentPointIds(from) : Promise.resolve([]),
      to ? resolveEquivalentPointIds(to) : Promise.resolve([]),
    ]);

    if (from) {
      where.origin =
        fromIds.length > 0 ? { id: { in: fromIds } } : { name: { contains: from, mode: "insensitive" } };
    }
    if (to) {
      where.destination =
        toIds.length > 0 ? { id: { in: toIds } } : { name: { contains: to, mode: "insensitive" } };
    }

    const routes = await prisma.routeTemplate.findMany({
      where,
      select: {
        id: true,
        departureTime: true,
        daysOfWeek: true,
        seats: true,
        price: true,
        origin: { select: { name: true } },
        destination: { select: { name: true } },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            ratingAsDriver: true,
            maxVerifiedAt: true,
            driverProfile: { select: { carModel: true, carColor: true, totalRides: true } },
          },
        },
        trips: {
          where: {
            date: { gte: today },
            status: { in: [...ACTIVE_TRIP_STATUSES] },
          },
          orderBy: { date: "asc" },
          take: 5,
          select: {
            id: true,
            date: true,
            departureTime: true,
            status: true,
            availableSeats: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const formatted = routes
      .map((route) => {
        const trips = route.trips
          .filter((trip) => !date || trip.date.toISOString().slice(0, 10) === date)
          .map((trip) => ({
            id: trip.id,
            date: trip.date,
            departureTime: trip.departureTime,
            status: trip.status,
            availableSeats: trip.availableSeats,
            totalSeats: route.seats,
          }));

        return {
          id: route.id,
          from: route.origin.name,
          to: route.destination.name,
          time: route.departureTime,
          price: route.price,
          seats: route.seats,
          days: route.daysOfWeek.map((d) => DAY_NAMES[d] || String(d)).join(", "),
          driver: {
            id: route.driver.id,
            name: `${route.driver.firstName} ${route.driver.lastName || ""}`.trim(),
            car: route.driver.driverProfile?.carModel || "Не указано",
            carColor: route.driver.driverProfile?.carColor || "",
            verified: Boolean(route.driver.maxVerifiedAt),
            ratingAsDriver: route.driver.ratingAsDriver ?? 5,
          },
          nextTrips: trips,
        };
      })
      .filter((route) => (passengers > 1 ? route.nextTrips.some((t) => t.availableSeats >= passengers) : true));

    return ok({ count: formatted.length, routes: formatted });
  } catch (error) {
    return serverError("routes.list", error);
  }
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  const parsed = await parseBody(request, routeCreateSchema);
  if (!parsed.ok) return parsed.response;

  const { originId, destId, departureTime, daysOfWeek, seats, price } = parsed.data;

  const limited = rateLimitByUser("routes:create", sessionUser.id, 10, 60 * 60 * 1000);
  if (!limited.allowed) return errors.rateLimited(limited.retryAfterSec);

  if (originId === destId) {
    return errors.badRequest("Точки отправления и назначения должны отличаться");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { driverProfile: { select: { id: true } } },
    });
    if (!user?.driverProfile) {
      return errors.forbidden("Сначала зарегистрируйся как водитель");
    }

    const [origin, dest] = await Promise.all([
      prisma.cityPoint.findUnique({ where: { id: originId }, select: { id: true } }),
      prisma.cityPoint.findUnique({ where: { id: destId }, select: { id: true } }),
    ]);
    if (!origin || !dest) {
      return errors.badRequest("Точки не найдены");
    }

    const existing = await prisma.routeTemplate.findFirst({
      where: {
        driverId: sessionUser.id,
        originId,
        destId,
        departureTime,
        daysOfWeek: { equals: daysOfWeek },
        active: true,
      },
      select: { id: true },
    });
    if (existing) {
      return errors.conflict("У тебя уже есть такой активный маршрут");
    }

    const serviceFee = Math.round(price * (PRICING_CONFIG.serviceFeePercent / 100));
    const route = await prisma.routeTemplate.create({
      data: {
        driverId: sessionUser.id,
        originId,
        destId,
        departureTime,
        daysOfWeek,
        seats,
        price,
        serviceFee,
        isRecurring: true,
        active: true,
      },
      select: {
        id: true,
        departureTime: true,
        price: true,
        seats: true,
        origin: { select: { name: true } },
        destination: { select: { name: true } },
      },
    });

    return ok({
      route: {
        id: route.id,
        from: route.origin.name,
        to: route.destination.name,
        time: route.departureTime,
        price: route.price,
        seats: route.seats,
      },
    });
  } catch (error) {
    return serverError("routes.create", error);
  }
}
