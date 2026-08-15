import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Не авторизован" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");

    const notifications = await prisma.notification.findMany({
      where: { userId: sessionUser.id, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: sessionUser.id, read: false },
    });

    return NextResponse.json({ success: true, notifications, unreadCount });
  } catch (error) {
    console.error("Notifications fetch error:", error);
    return NextResponse.json({ success: false, error: "Ошибка" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Не авторизован" }, { status: 401 });
    }

    const { notificationIds, read } = await request.json();

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json({ success: false, error: "Неверные данные" }, { status: 400 });
    }

    await prisma.notification.updateMany({
      where: { id: { in: notificationIds }, userId: sessionUser.id },
      data: { read: read ?? true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notifications mark read error:", error);
    return NextResponse.json({ success: false, error: "Ошибка" }, { status: 500 });
  }
}