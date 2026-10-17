import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser, invalidateSessionCache } from "@/lib/auth";
import { errors, ok, parseBody, serverError } from "@/lib/http";
import { profileUpdateSchema } from "@/lib/schemas";
import { rateLimitByUser } from "@/lib/rate-limit";

/** Обновление личных данных: имя, телефон, «о себе». */
export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  const parsed = await parseBody(request, profileUpdateSchema);
  if (!parsed.ok) return parsed.response;

  const limited = rateLimitByUser("profile:update", sessionUser.id, 20, 60 * 60 * 1000);
  if (!limited.allowed) return errors.rateLimited(limited.retryAfterSec);

  const { firstName, lastName, phone, bio } = parsed.data;

  try {
    const cleanPhone = phone ? phone.trim().replace(/\s+/g, " ") : null;
    const updated = await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        firstName,
        lastName: lastName || null,
        phone: cleanPhone || null,
        bio: bio || null,
      },
      select: { id: true, firstName: true, lastName: true, phone: true, bio: true },
    });

    invalidateSessionCache(sessionUser.id);
    return ok({ user: updated });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return errors.conflict("Этот номер телефона уже привязан к другому аккаунту");
    }
    return serverError("profile.update", error);
  }
}
