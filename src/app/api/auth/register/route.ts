import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSessionToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { generateReferralCode } from "@/lib/referral";

export async function POST(request: Request) {
  try {
    const { login, password, firstName, lastName, referralCode } = await request.json();

    if (!login || !password || !firstName) {
      return NextResponse.json(
        { success: false, error: "Заполни все поля" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Пароль должен быть минимум 6 символов" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { login } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Логин уже занят" },
        { status: 400 }
      );
    }

    let referrer = null;
    if (referralCode) {
      referrer = await prisma.user.findUnique({ where: { referralCode } });
      if (!referrer) {
        return NextResponse.json(
          { success: false, error: "Неверный реферальный код" },
          { status: 400 }
        );
      }
    }

    const passwordHash = await hashPassword(password);

    let newReferralCode = generateReferralCode();
    while (await prisma.user.findUnique({ where: { referralCode: newReferralCode } })) {
      newReferralCode = generateReferralCode();
    }

    const user = await prisma.user.create({
      data: {
        login,
        passwordHash,
        firstName,
        lastName: lastName || null,
        role: "PASSENGER",
        referralCode: newReferralCode,
        referredBy: referrer ? referrer.referralCode : null,
      },
    });

    const token = await createSessionToken({
      id: user.id,
      login: user.login || "",
      firstName: user.firstName,
      lastName: user.lastName ?? undefined,
      role: user.role,
      referralCode: user.referralCode ?? undefined,
      referredBy: user.referredBy ?? undefined,
    });

    try {
      const cookieStore = await cookies();
      cookieStore.set("session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
    } catch (cookieError) {
      console.error("Cookie error:", cookieError);
    }

    if (referrer) {
      try {
        const { sendNotificationToUser, createNotificationPayload } = await import("@/lib/push");
        await sendNotificationToUser(referrer.id, createNotificationPayload(
          "Новый пассажир по твоей ссылке 🎉",
          `${user.firstName} зарегистрировался(ась) с твоим реферальным кодом. Бонус начислится после первой поездки.`,
          { url: "/profile" }
        ));
      } catch (pushError) {
        console.error("Referrer notification error:", pushError);
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        login: user.login,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      isNewUser: true,
    });
  } catch (error) {
    console.error("Register error:", error);
    console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return NextResponse.json(
      { success: false, error: `Ошибка регистрации: ${error instanceof Error ? error.message : "неизвестная"}` },
      { status: 500 }
    );
  }
}
