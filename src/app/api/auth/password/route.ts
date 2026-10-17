import { prisma } from "@/lib/prisma";
import { getSessionUser, hashPassword, invalidateSessionCache, verifyPassword } from "@/lib/auth";
import { errors, ok, parseBody, serverError } from "@/lib/http";
import { passwordChangeSchema } from "@/lib/schemas";
import { rateLimitByUser } from "@/lib/rate-limit";

/** Смена пароля: только со знанием текущего. */
export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  const parsed = await parseBody(request, passwordChangeSchema);
  if (!parsed.ok) return parsed.response;

  const limited = rateLimitByUser("auth:password", sessionUser.id, 5, 60 * 60 * 1000);
  if (!limited.allowed) return errors.rateLimited(limited.retryAfterSec);

  const { currentPassword, newPassword } = parsed.data;
  if (currentPassword === newPassword) {
    return errors.badRequest("Новый пароль должен отличаться от текущего");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { passwordHash: true },
    });
    if (!user?.passwordHash) {
      return errors.badRequest("Пароль не задан — войди по другому способу");
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      return errors.badRequest("Текущий пароль неверный");
    }

    await prisma.user.update({
      where: { id: sessionUser.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    invalidateSessionCache(sessionUser.id);

    return ok();
  } catch (error) {
    return serverError("auth.password", error);
  }
}
