import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Не авторизован" }, { status: 401 });
    }

    const { originId, destId, desiredTime, daysOfWeek } = await request.json();

    if (!originId || !destId) {
      return NextResponse.json({ success: false, error: "Укажи точки" }, { status: 400 });
    }

    const demand = await prisma.demandRequest.create({
      data: {
        userId: sessionUser.id,
        originId,
        destId,
        desiredTime: desiredTime || null,
        daysOfWeek: daysOfWeek || [],
      },
    });

    return NextResponse.json({ success: true, demand });
  } catch (error) {
    console.error("Demand request error:", error);
    return NextResponse.json({ success: false, error: "Ошибка" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Не авторизован" }, { status: 401 });
    }

    const demands = await prisma.demandRequest.findMany({
      where: { userId: sessionUser.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, demands });
  } catch (error) {
    console.error("Demand requests fetch error:", error);
    return NextResponse.json({ success: false, error: "Ошибка" }, { status: 500 });
  }
}