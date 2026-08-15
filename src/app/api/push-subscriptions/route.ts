import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getVapidPublicKey } from "@/lib/push";

export async function GET() {
  return NextResponse.json({ success: true, publicKey: getVapidPublicKey() });
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Не авторизован" }, { status: 401 });
    }

    const { endpoint, keys } = await request.json();

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ success: false, error: "Неверные данные подписки" }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId: sessionUser.id, p256dh: keys.p256dh, auth: keys.auth },
      create: { userId: sessionUser.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscription error:", error);
    return NextResponse.json({ success: false, error: "Ошибка" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Не авторизован" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get("endpoint");

    if (!endpoint) {
      return NextResponse.json({ success: false, error: "Не указан endpoint" }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: sessionUser.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscription delete error:", error);
    return NextResponse.json({ success: false, error: "Ошибка" }, { status: 500 });
  }
}