import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { errors, ok, parseBody, serverError } from "@/lib/http";
import { pushSubscriptionSchema } from "@/lib/schemas";
import { getVapidPublicKey } from "@/lib/push";

export async function GET() {
  return ok({ publicKey: getVapidPublicKey() });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  const parsed = await parseBody(request, pushSubscriptionSchema);
  if (!parsed.ok) return parsed.response;

  const { endpoint, keys } = parsed.data;

  try {
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint },
      select: { id: true, userId: true },
    });

    // Подписка с таким endpoint уже принадлежит другому аккаунту — не перехватываем
    if (existing && existing.userId !== sessionUser.id) {
      return errors.conflict("Эта подписка привязана к другому аккаунту");
    }

    if (existing) {
      await prisma.pushSubscription.update({
        where: { endpoint },
        data: { p256dh: keys.p256dh, auth: keys.auth },
      });
    } else {
      await prisma.pushSubscription.create({
        data: {
          userId: sessionUser.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
      });
    }

    return ok();
  } catch (error) {
    return serverError("push.subscribe", error);
  }
}

export async function DELETE(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  try {
    const url = new URL(request.url);
    const endpoint = url.searchParams.get("endpoint");
    if (!endpoint) return errors.badRequest("Не указан endpoint");

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: sessionUser.id },
    });

    return ok();
  } catch (error) {
    return serverError("push.unsubscribe", error);
  }
}
