import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { errors, ok, parseBody, parseQuery, serverError } from "@/lib/http";
import { notificationsPatchSchema, notificationsQuerySchema } from "@/lib/schemas";

export async function GET(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  const parsed = parseQuery(request, notificationsQuerySchema);
  if (!parsed.ok) return parsed.response;

  const { unread, limit } = parsed.data;

  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: sessionUser.id, ...(unread === "true" ? { read: false } : {}) },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          read: true,
          relatedEntityId: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where: { userId: sessionUser.id, read: false } }),
    ]);

    return ok({ notifications, unreadCount });
  } catch (error) {
    return serverError("notifications.list", error);
  }
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  const parsed = await parseBody(request, notificationsPatchSchema);
  if (!parsed.ok) return parsed.response;

  const { notificationIds, read } = parsed.data;

  try {
    const updated = await prisma.notification.updateMany({
      where: { id: { in: notificationIds }, userId: sessionUser.id },
      data: { read: read ?? true },
    });

    return ok({ updated: updated.count });
  } catch (error) {
    return serverError("notifications.patch", error);
  }
}
