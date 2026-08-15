import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(
  _request: Request,
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
      include: { routeTemplate: { select: { driverId: true } } },
    });

    if (!trip) {
      return NextResponse.json({ success: false, error: "Поездка не найдена" }, { status: 404 });
    }

    if (trip.routeTemplate.driverId !== sessionUser.id) {
      return NextResponse.json({ success: false, error: "Не твоя поездка" }, { status: 403 });
    }

    if (trip.driverConfirmed) {
      return NextResponse.json({ success: false, error: "Уже подтверждена" }, { status: 400 });
    }

    if (!["PENDING_CONFIRMATION", "SCHEDULED"].includes(trip.status)) {
      return NextResponse.json({ success: false, error: "Поездку нельзя подтвердить в текущем статусе" }, { status: 400 });
    }

    await prisma.trip.update({
      where: { id: tripId },
      data: {
        driverConfirmed: true,
        confirmedAt: new Date(),
        confirmationDeadline: null,
        status: "CONFIRMED",
      },
    });

    await prisma.booking.updateMany({
      where: { tripId, status: "PENDING" },
      data: { status: "CONFIRMED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Confirm trip error:", error);
    return NextResponse.json({ success: false, error: "Ошибка" }, { status: 500 });
  }
}