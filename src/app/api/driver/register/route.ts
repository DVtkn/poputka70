import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: "Сначала войди в систему" },
        { status: 401 }
      );
    }

    const { carModel, carNumber, carColor } = await request.json();

    if (!carModel || !carNumber) {
      return NextResponse.json(
        { success: false, error: "Заполни модель и номер авто" },
        { status: 400 }
      );
    }

    // Обновляем роль пользователя на DRIVER
    await prisma.user.update({
      where: { id: sessionUser.id },
      data: { role: "DRIVER" },
    });

    // Создаём или обновляем DriverProfile
    const driverProfile = await prisma.driverProfile.upsert({
      where: { userId: sessionUser.id },
      update: { 
        carModel, 
        carNumber, 
        carColor: carColor || null 
      },
      create: {
        userId: sessionUser.id,
        carModel,
        carNumber,
        carColor: carColor || null,
      },
    });

    return NextResponse.json({
      success: true,
      driverProfile: {
        id: driverProfile.id,
        carModel: driverProfile.carModel,
        carNumber: driverProfile.carNumber,
      },
    });
  } catch (error) {
    console.error("Driver registration error:", error);
    return NextResponse.json(
      { success: false, error: `Ошибка регистрации: ${error instanceof Error ? error.message : "неизвестная"}` },
      { status: 500 }
    );
  }
}
