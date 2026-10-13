import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSessionToken, hashPassword, setSessionCookie } from "@/lib/auth";
import { errors, ok, parseBody, serverError } from "@/lib/http";
import { registerSchema } from "@/lib/schemas";
import { generateReferralCode } from "@/lib/referral";
import { rateLimitByIp } from "@/lib/rate-limit";
import { sendNotificationToUser, createNotificationPayload } from "@/lib/push";

const MAX_CODE_ATTEMPTS = 5;

export async function POST(request: Request) {
  const parsed = await parseBody(request, registerSchema);
  if (!parsed.ok) return parsed.response;

  const { login, password, firstName, lastName, referralCode } = parsed.data;

  const byIp = rateLimitByIp(request, "auth:register", 5, 60 * 60 * 1000);
  if (!byIp.allowed) return errors.rateLimited(byIp.retryAfterSec);

  try {
    const existing = await prisma.user.findUnique({ where: { login }, select: { id: true } });
    if (existing) {
      return errors.conflict("Логин уже занят");
    }

    let referrer: { id: string; referralCode: string | null } | null = null;
    if (referralCode) {
      referrer = await prisma.user.findUnique({
        where: { referralCode },
        select: { id: true, referralCode: true },
      });
      if (!referrer) {
        return errors.badRequest("Неверный реферальный код");
      }
    }

    const passwordHash = await hashPassword(password);

    let user = null;
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS && !user; attempt++) {
      const newReferralCode = generateReferralCode();
      try {
        user = await prisma.user.create({
          data: {
            login,
            passwordHash,
            firstName,
            lastName: lastName || null,
            role: "PASSENGER",
            referralCode: newReferralCode,
            referredBy: referrer ? referrer.referralCode : null,
          },
          select: { id: true, login: true, firstName: true, lastName: true, role: true },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          const target = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : "";
          if (target.includes("login")) return errors.conflict("Логин уже занят");
          continue; // коллизия реферального кода — пробуем ещё раз
        }
        throw error;
      }
    }

    if (!user) {
      return serverError("auth.register", new Error("Не удалось сгенерировать реферальный код"));
    }

    const token = await createSessionToken(user.id);
    await setSessionCookie(token);

    if (referrer) {
      const title = "Новый пассажир по твоей ссылке";
      const body = `${user.firstName} зарегистрировался(ась) с твоим реферальным кодом. Бонус начислится после первой поездки.`;
      await prisma.notification.create({
        data: { userId: referrer.id, type: "REFERRAL_JOINED", title, body },
      });
      await sendNotificationToUser(
        referrer.id,
        createNotificationPayload(title, body, { url: "/profile" })
      ).catch(() => 0);
    }

    return ok({
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
    return serverError("auth.register", error);
  }
}
