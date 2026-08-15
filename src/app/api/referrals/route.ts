import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { sendNotificationToUser, createNotificationPayload } from "@/lib/push";

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Не авторизован" }, { status: 401 });
    }

    let referralCode = sessionUser.referralCode;
    if (!referralCode) {
      let unique = false;
      while (!unique) {
        const code = generateReferralCode();
        const exists = await prisma.user.findUnique({ where: { referralCode: code } });
        if (!exists) {
          referralCode = code;
          unique = true;
        }
      }
      await prisma.user.update({
        where: { id: sessionUser.id },
        data: { referralCode },
      });
    }

    const referrals = await prisma.user.findMany({
      where: { referredBy: sessionUser.referralCode },
      select: { id: true, firstName: true, createdAt: true },
    });

    return NextResponse.json({ success: true, referralCode, referrals });
  } catch (error) {
    console.error("Referral get error:", error);
    return NextResponse.json({ success: false, error: "Ошибка" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Не авторизован" }, { status: 401 });
    }

    const { referralCode } = await request.json();

    if (!referralCode) {
      return NextResponse.json({ success: false, error: "Код не указан" }, { status: 400 });
    }

    if (referralCode === sessionUser.referralCode) {
      return NextResponse.json({ success: false, error: "Нельзя использовать свой код" }, { status: 400 });
    }

    if (sessionUser.referredBy) {
      return NextResponse.json({ success: false, error: "Код уже применён" }, { status: 400 });
    }

    const referrer = await prisma.user.findUnique({ where: { referralCode } });
    if (!referrer) {
      return NextResponse.json({ success: false, error: "Код не найден" }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: sessionUser.id },
      data: { referredBy: referralCode },
    });

    await sendNotificationToUser(referrer.id, createNotificationPayload(
      "Новый реферал!",
      `${sessionUser.firstName} зарегистрировался по вашему коду. Бонус начислится после первой поездки.`,
      { url: "/profile" }
    ));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Referral apply error:", error);
    return NextResponse.json({ success: false, error: "Ошибка" }, { status: 500 });
  }
}