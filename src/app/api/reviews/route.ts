import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { sendNotificationToUser, createNotificationPayload } from "@/lib/push";

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Не авторизован" }, { status: 401 });
    }

    const { bookingId, rating, comment } = await request.json();

    if (!bookingId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, error: "Неверные данные" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        trip: {
          include: { routeTemplate: { select: { driverId: true } } },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: "Бронирование не найдено" }, { status: 404 });
    }

    if (booking.passengerId !== sessionUser.id && booking.trip.routeTemplate.driverId !== sessionUser.id) {
      return NextResponse.json({ success: false, error: "Не участник поездки" }, { status: 403 });
    }

    if (booking.trip.status !== "COMPLETED") {
      return NextResponse.json({ success: false, error: "Поездка не завершена" }, { status: 400 });
    }

    const existingReview = await prisma.review.findUnique({ where: { bookingId } });
    if (existingReview) {
      return NextResponse.json({ success: false, error: "Отзыв уже оставлен" }, { status: 400 });
    }

    const isDriver = booking.trip.routeTemplate.driverId === sessionUser.id;
    const revieweeId = isDriver ? booking.passengerId : booking.trip.routeTemplate.driverId;

    const review = await prisma.review.create({
      data: {
        bookingId,
        reviewerId: sessionUser.id,
        revieweeId,
        rating,
        comment: comment || null,
      },
    });

    const reviews = await prisma.review.findMany({
      where: { revieweeId },
      select: { rating: true },
    });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await prisma.user.update({
      where: { id: revieweeId },
      data: { [isDriver ? "ratingAsPassenger" : "ratingAsDriver"]: avgRating },
    });

    await sendNotificationToUser(revieweeId, createNotificationPayload(
      "Новый отзыв",
      `Вы получили ${rating}★ от ${sessionUser.firstName}`,
      { url: `/users/${revieweeId}` }
    ));

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error("Review create error:", error);
    return NextResponse.json({ success: false, error: "Ошибка" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Не авторизован" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const reviews = await prisma.review.findMany({
      where: { revieweeId: userId || sessionUser.id },
      include: { reviewer: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, reviews });
  } catch (error) {
    console.error("Reviews fetch error:", error);
    return NextResponse.json({ success: false, error: "Ошибка" }, { status: 500 });
  }
}