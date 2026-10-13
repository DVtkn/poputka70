import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { errors, ok, parseBody, serverError } from "@/lib/http";
import { reviewCreateSchema } from "@/lib/schemas";
import { createNotificationPayload, sendNotificationToUser } from "@/lib/push";
import { rateLimitByUser } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  const parsed = await parseBody(request, reviewCreateSchema);
  if (!parsed.ok) return parsed.response;

  const { bookingId, rating, comment } = parsed.data;

  const limited = rateLimitByUser("reviews:create", sessionUser.id, 10, 60 * 60 * 1000);
  if (!limited.allowed) return errors.rateLimited(limited.retryAfterSec);

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        passengerId: true,
        trip: {
          select: {
            status: true,
            routeTemplate: { select: { driverId: true } },
          },
        },
      },
    });

    if (!booking) return errors.notFound("Бронирование не найдено");

    const isParticipant =
      booking.passengerId === sessionUser.id ||
      booking.trip.routeTemplate.driverId === sessionUser.id;
    if (!isParticipant) return errors.forbidden("Ты не участник поездки");

    if (booking.trip.status !== "COMPLETED") {
      return errors.badRequest("Поездка ещё не завершена");
    }

    const isDriver = booking.trip.routeTemplate.driverId === sessionUser.id;
    const revieweeId = isDriver ? booking.passengerId : booking.trip.routeTemplate.driverId;

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.review.findUnique({ where: { bookingId }, select: { id: true } });
      if (existing) return { alreadyExists: true as const };

      await tx.review.create({
        data: {
          bookingId,
          reviewerId: sessionUser.id,
          revieweeId,
          rating,
          comment: comment || null,
        },
      });

      // Пересчёт среднего рейтинга в той же транзакции — без гонок
      const aggregate = await tx.review.aggregate({
        where: { revieweeId },
        _avg: { rating: true },
      });
      const average = aggregate._avg.rating ?? 5;

      await tx.user.update({
        where: { id: revieweeId },
        data: isDriver ? { ratingAsPassenger: average } : { ratingAsDriver: average },
      });

      return { alreadyExists: false as const };
    });

    if (result.alreadyExists) {
      return errors.conflict("Отзыв уже оставлен");
    }

    const title = "Новый отзыв";
    const body = `Тебе поставили ${rating} из 5${comment ? `: «${comment.slice(0, 120)}»` : "."}`;
    await prisma.notification.create({
      data: { userId: revieweeId, type: "REVIEW_RECEIVED", title, body, relatedEntityId: bookingId },
    });
    await sendNotificationToUser(
      revieweeId,
      createNotificationPayload(title, body, { url: `/users/${revieweeId}` })
    ).catch(() => 0);

    return ok({ rating });
  } catch (error) {
    return serverError("reviews.create", error);
  }
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return errors.authRequired();

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") || sessionUser.id;

    const reviews = await prisma.review.findMany({
      where: { revieweeId: userId },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        reviewer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const aggregate = await prisma.review.aggregate({
      where: { revieweeId: userId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return ok({
      reviews,
      average: aggregate._avg.rating ?? null,
      count: aggregate._count.rating,
    });
  } catch (error) {
    return serverError("reviews.list", error);
  }
}
