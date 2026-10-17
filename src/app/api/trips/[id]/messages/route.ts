import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { errors, ok, parseBody, serverError } from "@/lib/http";
import { chatMessageSchema } from "@/lib/schemas";
import { rateLimitByUser } from "@/lib/rate-limit";
import { createNotificationPayload, sendNotificationToUser } from "@/lib/push";
import { tripRoute } from "@/lib/trip-rules";
import { tripRouteSelect } from "@/lib/trips";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await context.params;
  if (!tripId) return errors.badRequest("Не указан идентификатор поездки");

  const sessionUser = await getSessionUser();

  try {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        driverId: true,
        routeTemplate: { select: { driverId: true } },
      },
    });

    if (!trip) return errors.notFound("Поездка не найдена");
    const driverId = trip.driverId ?? trip.routeTemplate?.driverId ?? null;

    const messages = await prisma.chatMessage.findMany({
      where: { tripId },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        text: true,
        createdAt: true,
        senderId: true,
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            driverProfile: { select: { carModel: true } },
          },
        },
      },
    });

    const formatted = messages.map((m) => {
      const isDriver = m.senderId === driverId;
      const isMine = sessionUser ? sessionUser.id === m.senderId : false;

      return {
        id: m.id,
        text: m.text,
        createdAt: m.createdAt,
        sender: {
          id: m.sender.id,
          firstName: m.sender.firstName,
          lastName: m.sender.lastName,
          isDriver,
          carModel: isDriver ? m.sender.driverProfile?.carModel ?? null : null,
        },
        isMine,
      };
    });

    return ok({
      messages: formatted,
      driverId,
      currentUserId: sessionUser?.id ?? null,
    });
  } catch (error) {
    return serverError("trips.messages.list", error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  const { id: tripId } = await context.params;
  if (!tripId) return errors.badRequest("Не указан идентификатор поездки");

  const parsed = await parseBody(request, chatMessageSchema);
  if (!parsed.ok) return parsed.response;

  const limited = rateLimitByUser("trips:message", sessionUser.id, 30, 60 * 1000);
  if (!limited.allowed) return errors.rateLimited(limited.retryAfterSec);

  const { text } = parsed.data;

  try {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        departureTime: true,
        ...tripRouteSelect,
        bookings: {
          where: { status: { in: ["PENDING", "CONFIRMED"] } },
          select: { passengerId: true },
        },
      },
    });

    if (!trip) return errors.notFound("Поездка не найдена");
    const route = tripRoute(trip);
    const driverId = route?.driverId ?? null;
    const isDriver = sessionUser.id === driverId;

    const message = await prisma.chatMessage.create({
      data: {
        tripId,
        senderId: sessionUser.id,
        text,
      },
      select: {
        id: true,
        text: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            driverProfile: { select: { carModel: true } },
          },
        },
      },
    });

    // Оповещения участникам поездки
    const routeLabel = route ? `${route.originName} → ${route.destName}` : "Поездка";
    const truncatedText = text.length > 80 ? `${text.slice(0, 77)}...` : text;

    try {
      if (!isDriver && driverId) {
        // Пассажир написал водителю
        const title = `Сообщение от ${sessionUser.firstName}`;
        const body = `${routeLabel}: «${truncatedText}»`;

        await prisma.notification.create({
          data: {
            userId: driverId,
            type: "TRIP_MESSAGE",
            title,
            body,
            relatedEntityId: tripId,
          },
        });

        await sendNotificationToUser(
          driverId,
          createNotificationPayload(title, body, { url: `/trips/${tripId}#chat` })
        ).catch(() => 0);
      } else if (isDriver) {
        // Водитель ответил пассажирам
        const passengerIds = Array.from(new Set(trip.bookings.map((b) => b.passengerId)));
        for (const passengerId of passengerIds) {
          if (passengerId === sessionUser.id) continue;
          const title = `Водитель в чате поездки`;
          const body = `${routeLabel}: «${truncatedText}»`;

          await prisma.notification.create({
            data: {
              userId: passengerId,
              type: "TRIP_MESSAGE",
              title,
              body,
              relatedEntityId: tripId,
            },
          });

          await sendNotificationToUser(
            passengerId,
            createNotificationPayload(title, body, { url: `/trips/${tripId}#chat` })
          ).catch(() => 0);
        }
      }
    } catch (notifyErr) {
      console.error("[chat.notify] ошибка отправки оповещения:", notifyErr);
    }

    return ok({
      message: {
        id: message.id,
        text: message.text,
        createdAt: message.createdAt,
        sender: {
          id: message.sender.id,
          firstName: message.sender.firstName,
          lastName: message.sender.lastName,
          isDriver,
          carModel: isDriver ? message.sender.driverProfile?.carModel ?? null : null,
        },
        isMine: true,
      },
    });
  } catch (error) {
    return serverError("trips.messages.create", error);
  }
}
