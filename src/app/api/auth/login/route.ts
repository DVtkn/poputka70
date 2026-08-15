import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { login, password } = await request.json();

    if (!login || !password) {
      return NextResponse.json(
        { success: false, error: "Введи логин и пароль" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ 
      where: { login },
      include: { driverProfile: true }
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Неверный логин или пароль" },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash || "");
    
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Неверный логин или пароль" },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "Аккаунт заблокирован. Обратись в поддержку." },
        { status: 403 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    const isNewUser = user.role === "PASSENGER" && !user.driverProfile;

    const token = await createSessionToken({
      id: user.id,
      login: user.login || "",
      firstName: user.firstName,
      lastName: user.lastName ?? undefined,
      role: user.role,
      referralCode: user.referralCode ?? undefined,
      referredBy: user.referredBy ?? undefined,
    });

    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        login: user.login,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      isNewUser,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Ошибка входа" },
      { status: 500 }
    );
  }
}
