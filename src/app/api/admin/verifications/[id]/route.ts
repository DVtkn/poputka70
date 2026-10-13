import { prisma } from "@/lib/prisma";
import { getSessionUser, isAdmin, invalidateSessionCache } from "@/lib/auth";
import { errors, ok, parseBody, serverError } from "@/lib/http";
import { adminVerificationSchema } from "@/lib/schemas";
import { createNotificationPayload, sendNotificationToUser } from "@/lib/push";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();
  if (!isAdmin(sessionUser)) return errors.forbidden();

  const { id: driverProfileId } = await context.params;
  if (!driverProfileId) return errors.badRequest("Не указан профиль водителя");

  const parsed = await parseBody(request, adminVerificationSchema);
  if (!parsed.ok) return parsed.response;

  const { action, comment } = parsed.data;
  const approved = action === "APPROVE";

  try {
    const profile = await prisma.driverProfile.findUnique({
      where: { id: driverProfileId },
      select: { id: true, userId: true, verificationStatus: true },
    });
    if (!profile) return errors.notFound("Профиль не найден");

    const newStatus = approved ? "APPROVED" : "REJECTED";
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.driverProfile.updateMany({
        where: { id: driverProfileId, verificationStatus: "PENDING" },
        data: {
          verificationStatus: newStatus,
          verifiedAt: now,
          verificationComment: comment || null,
        },
      });
      if (updated.count === 0) return null;

      await tx.user.update({
        where: { id: profile.userId },
        data: approved
          ? { maxVerifiedAt: now, maxVerifiedBy: sessionUser.id }
          : { maxVerifiedAt: null, maxVerifiedBy: null },
      });

      const title = approved ? "Верификация одобрена" : "Верификация отклонена";
      const body = approved
        ? "Твой профиль помечен как «Проверен» — пассажиры видят бейдж доверия."
        : `Твоя верификация отклонена.${comment ? ` Причина: ${comment}` : " Обратись в поддержку, если это ошибка."}`;

      await tx.notification.create({
        data: {
          userId: profile.userId,
          type: approved ? "DRIVER_VERIFIED" : "DRIVER_VERIFICATION_REJECTED",
          title,
          body,
          relatedEntityId: driverProfileId,
        },
      });

      return { userId: profile.userId, title, body };
    });

    if (!result) {
      return errors.conflict("Заявка уже обработана");
    }

    invalidateSessionCache(result.userId);

    await sendNotificationToUser(
      result.userId,
      createNotificationPayload(result.title, result.body, { url: "/profile/verify" })
    ).catch(() => 0);

    return ok({ message: approved ? "Верификация одобрена" : "Верификация отклонена" });
  } catch (error) {
    return serverError("admin.verifications.patch", error);
  }
}
