import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Нет доступа" }, { status: 403 });
    }

    const { driverProfileId, action, comment } = await request.json();

    if (!driverProfileId || !action) {
      return NextResponse.json({ success: false, error: "Неверные параметры" }, { status: 400 });
    }

    if (!["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ success: false, error: "Неизвестное действие" }, { status: 400 });
    }

    const profile = await prisma.driverProfile.findUnique({
      where: { id: driverProfileId },
      include: { user: true },
    });

    if (!profile) {
      return NextResponse.json({ success: false, error: "Профиль не найден" }, { status: 404 });
    }

    if (profile.verificationStatus !== "PENDING") {
      return NextResponse.json({ success: false, error: "Уже обработано" }, { status: 400 });
    }

    const newStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

    await prisma.$transaction([
      prisma.driverProfile.update({
        where: { id: driverProfileId },
        data: {
          verificationStatus: newStatus,
          verifiedAt: new Date(),
          verificationComment: comment || null,
        },
      }),
      action === "APPROVE"
        ? prisma.user.update({
            where: { id: profile.userId },
            data: { maxVerifiedAt: new Date(), maxVerifiedBy: sessionUser.id },
          })
        : prisma.user.update({
            where: { id: profile.userId },
            data: { maxVerifiedAt: null },
          }),
      prisma.notification.create({
        data: {
          userId: profile.userId,
          type: action === "APPROVE" ? "DRIVER_VERIFIED" : "DRIVER_VERIFICATION_REJECTED",
          title: action === "APPROVE" ? "Верификация одобрена 🎉" : "Верификация отклонена",
          body:
            action === "APPROVE"
              ? "Поздравляем! Твой профиль помечен как «Проверен» — пассажиры видят бейдж доверия."
              : `Твоя верификация отклонена. ${comment ? `Причина: ${comment}` : "Обратись в поддержку, если это ошибка."}`,
          relatedEntityId: driverProfileId,
        },
      }),
    ]);

    return NextResponse.json({ success: true, message: action === "APPROVE" ? "Верификация одобрена" : "Верификация отклонена" });
  } catch (error) {
    console.error("Admin verify action error:", error);
    return NextResponse.json({ success: false, error: "Ошибка" }, { status: 500 });
  }
}