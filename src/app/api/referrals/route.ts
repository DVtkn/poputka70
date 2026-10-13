import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { errors, ok, parseBody, serverError } from "@/lib/http";
import { referralApplySchema } from "@/lib/schemas";
import { generateReferralCode } from "@/lib/referral";
import { createNotificationPayload, sendNotificationToUser } from "@/lib/push";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  try {
    let referralCode = sessionUser.referralCode;

    if (!referralCode) {
      for (let attempt = 0; attempt < 5 && !referralCode; attempt++) {
        const candidate = generateReferralCode();
        const exists = await prisma.user.findUnique({
          where: { referralCode: candidate },
          select: { id: true },
        });
        if (!exists) referralCode = candidate;
      }
      if (referralCode) {
        await prisma.user.update({
          where: { id: sessionUser.id },
          data: { referralCode },
        });
      }
    }

    const referrals = referralCode
      ? await prisma.user.findMany({
          where: { referredBy: referralCode },
          select: { id: true, firstName: true, createdAt: true },
          take: 100,
        })
      : [];

    return ok({ referralCode: referralCode ?? null, referrals });
  } catch (error) {
    return serverError("referrals.get", error);
  }
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  const parsed = await parseBody(request, referralApplySchema);
  if (!parsed.ok) return parsed.response;

  const { referralCode } = parsed.data;

  try {
    if (referralCode === sessionUser.referralCode) {
      return errors.badRequest("Нельзя использовать свой код");
    }
    if (sessionUser.referredBy) {
      return errors.conflict("Код уже применён");
    }

    const referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });
    if (!referrer) return errors.notFound("Код не найден");

    const updated = await prisma.user.updateMany({
      where: { id: sessionUser.id, referredBy: null },
      data: { referredBy: referralCode },
    });
    if (updated.count === 0) {
      return errors.conflict("Код уже применён");
    }

    const title = "Новый реферал";
    const body = `${sessionUser.firstName} зарегистрировался по твоему коду. Бонус начислится после первой поездки.`;
    await prisma.notification.create({
      data: { userId: referrer.id, type: "REFERRAL_APPLIED", title, body },
    });
    await sendNotificationToUser(
      referrer.id,
      createNotificationPayload(title, body, { url: "/profile" })
    ).catch(() => 0);

    return ok();
  } catch (error) {
    return serverError("referrals.apply", error);
  }
}
