import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const date = searchParams.get("date");
    const passengers = parseInt(searchParams.get("passengers") || "1", 10);

    const where: Prisma.RouteTemplateWhereInput = { active: true };

    if (from) {
      where.origin = { name: { contains: from, mode: "insensitive" } };
    }
    if (to) {
      where.destination = { name: { contains: to, mode: "insensitive" } };
    }

    const routes = await prisma.routeTemplate.findMany({
      where,
      include: {
        origin: true, destination: true,
        driver: {
          select: {
            id: true, firstName: true, lastName: true,
            ratingAsDriver: true,
            maxVerifiedAt: true,
            driverProfile: { select: { carModel: true, carColor: true, totalRides: true } }
          }
        },
        trips: {
          where: { date: { gte: new Date() }, status: { in: ["SCHEDULED", "CONFIRMED", "PENDING_CONFIRMATION"] } },
          orderBy: { date: "asc" }, take: 5,
          include: { bookings: { where: { status: { in: ["PENDING", "CONFIRMED"] } }, select: { id: true } } }
        },
      },
      orderBy: { createdAt: "desc" }, take: 50,
    });

    const dayNames: Record<number, string> = { 1: "Пн", 2: "Вт", 3: "Ср", 4: "Чт", 5: "Пт", 6: "Сб", 7: "Вс" };

    let formattedRoutes = routes.map(r => {
      const trips = r.trips
        .map(trip => ({
          id: trip.id,
          date: trip.date,
          departureTime: trip.departureTime,
          status: trip.status,
          availableSeats: r.seats - trip.bookings.length,
          totalSeats: r.seats,
        }))
        // фильтр даты на уровне рейсов (выбранную дату ищем в диапазоне рейсов)
        .filter(t => !date || new Date(t.date).toISOString().split("T")[0] === date);

      return {
        id: r.id,
        from: r.origin.name,
        to: r.destination.name,
        time: r.departureTime,
        price: r.price,
        seats: r.seats,
        days: r.daysOfWeek.map(d => dayNames[d] || String(d)).join(", "),
        driver: {
          id: r.driver.id,
          name: `${r.driver.firstName} ${r.driver.lastName || ""}`.trim(),
          car: r.driver.driverProfile?.carModel || "Не указано",
          carColor: r.driver.driverProfile?.carColor || "",
          verified: !!r.driver.maxVerifiedAt,
          ratingAsDriver: r.driver.ratingAsDriver ?? 5.0,
        },
        nextTrips: trips,
      };
    });

    // пассажиры: оставляем маршруты, где есть рейсы с нужным числом свободных мест
    if (passengers > 1) {
      formattedRoutes = formattedRoutes.filter(r => r.nextTrips.some(t => t.availableSeats >= passengers) || r.seats >= passengers);
    }

    return NextResponse.json({ success: true, count: formattedRoutes.length, routes: formattedRoutes });
  } catch (error) {
    console.error("Routes fetch error:", error);
    return NextResponse.json({ success: false, error: "Не удалось загрузить маршруты" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ success: false, error: "Сначала войди в систему" }, { status: 401 });

    const { originId, destId, departureTime, daysOfWeek, seats, price } = await request.json();
    if (!originId || !destId || !departureTime || !price) {
      return NextResponse.json({ success: false, error: "Заполни все поля" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: sessionUser.id }, include: { driverProfile: true } });
    if (!user || !user.driverProfile) {
      return NextResponse.json({ success: false, error: "Сначала зарегистрируйся как водитель" }, { status: 403 });
    }

    if (originId === destId) {
      return NextResponse.json({ success: false, error: "Точки отправления и назначения должны отличаться" }, { status: 400 });
    }

    const existing = await prisma.routeTemplate.findFirst({
      where: { driverId: user.id, originId, destId, departureTime, daysOfWeek: { equals: daysOfWeek }, active: true }
    });
    if (existing) {
      return NextResponse.json({ success: false, error: "У тебя уже есть такой активный маршрут" }, { status: 400 });
    }

    const serviceFee = Math.round(price * 0.15);
    const route = await prisma.routeTemplate.create({
      data: { driverId: user.id, originId, destId, departureTime, daysOfWeek, seats: seats || 3, price, serviceFee, isRecurring: true, active: true },
      include: { origin: true, destination: true },
    });

    return NextResponse.json({
      success: true,
      route: { id: route.id, from: route.origin.name, to: route.destination.name, time: route.departureTime, price: route.price, seats: route.seats },
    });
  } catch (error) {
    console.error("Route creation error:", error);
    return NextResponse.json({ success: false, error: "Не удалось создать маршрут" }, { status: 500 });
  }
}
