import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Не авторизован" }, { status: 401 });
    }

    const { id: tripId } = await context.params;

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        routeTemplate: { 
          select: { driverId: true, origin: { select: { name: true } }, destination: { select: { name: true } } } 
        },
        bookings: { where: { status: { in: ["PENDING", "CONFIRMED"] } }, select: { id: true, passengerId: true } },
      },
    });

    if (!trip) {
      return NextResponse.json({ success: false, error: "Поездка не найдена" }, { status: 404 });
    }

    if (trip.routeTemplate.driverId !== sessionUser.id) {
      return NextResponse.json({ success: false, error: "Не твоя поездка" }, { status: 403 });
    }

    if (trip.status === "COMPLETED" || trip.status.startsWith("CANCELLED")) {
      return NextResponse.json({ success: false, error: "Нельзя отменить" }, { status: 400 });
    }

    await prisma.trip.update({
      where: { id: tripId },
      data: { status: "CANCELLED_BY_DRIVER" },
    });

    await prisma.booking.updateMany({
      where: { tripId, status: { in: ["PENDING", "CONFIRMED"] } },
      data: { status: "CANCELLED" },
    });

    for (const booking of trip.bookings) {
      await prisma.notification.create({
        data: {
          userId: booking.passengerId,
          type: "TRIP_CANCELLED_BY_DRIVER",
          title: "Поездка отменена водителем",
          body: `Поездка ${trip.routeTemplate.origin.name} → ${trip.routeTemplate.destination.name} отменена. Сервисный сбор возвращён.`,
          relatedEntityId: tripId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel trip error:", error);
    return NextResponse.json({ success: false, error: "Ошибка" }, { status: 500 });
  }
}