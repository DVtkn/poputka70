import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getDistanceKm, getPricingVersion } from "@/lib/pricing";

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Сначала войди в систему" }, { status: 401 });
    }

    const { tripId } = await request.json();
    if (!tripId) {
      return NextResponse.json({ success: false, error: "Не указана поездка" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        include: {
          routeTemplate: {
            select: {
              price: true, serviceFee: true, seats: true, driverId: true,
              origin: { select: { lat: true, lng: true } },
              destination: { select: { lat: true, lng: true } },
            },
          },
        },
      });

      if (!trip) {
        throw new Error("Поездка не найдена");
      }

      if (trip.routeTemplate.driverId === sessionUser.id) {
        throw new Error("Нельзя забронировать свой маршрут");
      }

      // Атомарное резервирование места: updateMany с условием availableSeats > passengers
      // исключает overselling при параллельных запросах (гонках).
      const reserved = await tx.trip.updateMany({
        where: {
          id: tripId,
          status: { in: ["SCHEDULED", "PENDING_CONFIRMATION", "CONFIRMED"] },
          availableSeats: { gt: 0 },
        },
        data: { availableSeats: { decrement: 1 } },
      });

      if (reserved.count === 0) {
        throw new Error("Мест больше нет");
      }

      const existingBooking = await tx.booking.findUnique({
        where: { tripId_passengerId: { tripId, passengerId: sessionUser.id } },
      });
      if (existingBooking) {
        // возвращаем место, если бронь уже существовала
        await tx.trip.update({ where: { id: tripId }, data: { availableSeats: { increment: 1 } } });
        throw new Error("Вы уже забронировали это место");
      }

      const compensationAmount = trip.routeTemplate.price;
      const serviceFeeAmount = trip.routeTemplate.serviceFee || Math.round(compensationAmount * 0.15);
      const totalAmount = compensationAmount + serviceFeeAmount;

      const origin = trip.routeTemplate.origin;
      const destination = trip.routeTemplate.destination;
      const distanceKm = await getDistanceKm(origin.lat, origin.lng, destination.lat, destination.lng);

      const booking = await tx.booking.create({
        data: {
          tripId,
          passengerId: sessionUser.id,
          compensationAmount,
          serviceFeeAmount,
          totalAmount,
          distanceKm,
          pricingVersion: getPricingVersion(),
          status: "PENDING",
          serviceFeeStatus: "PENDING",
          offerAccepted: true,
        },
      });

      return { booking, compensationAmount, serviceFeeAmount, totalAmount };
    });

    return NextResponse.json({
      success: true,
      booking: {
        id: result.booking.id,
        compensation: result.compensationAmount,
        serviceFee: result.serviceFeeAmount,
        total: result.totalAmount,
      },
    });
  } catch (error) {
    console.error("Booking error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Ошибка бронирования" },
      { status: 400 }
    );
  }
}

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Не авторизован" }, { status: 401 });
    }

    const bookings = await prisma.booking.findMany({
      where: { passengerId: sessionUser.id },
      include: {
        trip: {
          include: {
            routeTemplate: {
              include: { origin: true, destination: true, driver: { select: { firstName: true, lastName: true, driverProfile: { select: { carModel: true, carNumber: true, carColor: true, verificationStatus: true } } } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, bookings });
  } catch (error) {
    console.error("Bookings fetch error:", error);
    return NextResponse.json({ success: false, error: "Ошибка" }, { status: 500 });
  }
}