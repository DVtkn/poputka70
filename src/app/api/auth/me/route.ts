import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: "Не авторизован" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: { driverProfile: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const isNewUser = user.role === "PASSENGER" && !user.driverProfile;

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        login: user.login,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        maxVerified: !!user.maxVerifiedAt,
        driverProfile: user.driverProfile ? {
          carModel: user.driverProfile.carModel,
          carNumber: user.driverProfile.carNumber,
          carColor: user.driverProfile.carColor,
        } : null,
      },
      isNewUser,
    });
  } catch (error) {
    console.error("Me endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Ошибка" },
      { status: 500 }
    );
  }
}
