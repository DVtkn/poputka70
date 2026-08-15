import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateCompensation, calculateServiceFee, calculateTotal, getDistanceKm, getPricingVersion } from "@/lib/pricing";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const originId = searchParams.get("originId");
    const destId = searchParams.get("destId");

    if (!originId || !destId) {
      return NextResponse.json({ success: false, error: "Укажи originId и destId" }, { status: 400 });
    }

    const [origin, dest] = await Promise.all([
      prisma.cityPoint.findUnique({ where: { id: originId }, select: { lat: true, lng: true } }),
      prisma.cityPoint.findUnique({ where: { id: destId }, select: { lat: true, lng: true } }),
    ]);

    if (!origin || !dest || origin.lat === null || origin.lng === null || dest.lat === null || dest.lng === null) {
      return NextResponse.json({ success: false, error: "Координаты не найдены" }, { status: 404 });
    }

    const distanceKm = await getDistanceKm(origin.lat, origin.lng, dest.lat, dest.lng);
    const compensation = calculateCompensation(distanceKm, "08:00");
    const serviceFee = calculateServiceFee(compensation);
    const total = calculateTotal(compensation);

    return NextResponse.json({
      success: true,
      pricing: {
        distanceKm,
        compensation,
        serviceFee,
        total,
        pricingVersion: getPricingVersion(),
      },
    });
  } catch (error) {
    console.error("Pricing suggest error:", error);
    return NextResponse.json({ success: false, error: "Ошибка расчёта" }, { status: 500 });
  }
}