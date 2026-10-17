import { prisma } from "@/lib/prisma";
import { sendNotificationToUser, sendNotificationToUsers, createNotificationPayload } from "@/lib/push";
import { cancelBooking } from "@/lib/bookings";
import { tripRoute } from "@/lib/trip-rules";
import { addDaysUtc, dayOfWeekUtc, formatTomskTime, instantFromTomsk, tomskTodayUtc } from "@/lib/time";

const BATCH_LIMIT = 200;

const tripDisplayInclude = {
  routeTemplate: {
    select: {
      driverId: true,
      price: true,
      seats: true,
      notes: true,
      origin: { select: { name: true, lat: true, lng: true } },
      destination: { select: { name: true, lat: true, lng: true } },
    },
  },
} as const;

/** Создаёт рейсы на завтра по активным шаблонам (наследие серий). Идемпотентно. */
export async function generateTomorrowTrips(): Promise<{ created: number; date: string }> {
  const tomorrow = addDaysUtc(tomskTodayUtc(), 1);
  const dow = dayOfWeekUtc(tomorrow);

  const templates = await prisma.routeTemplate.findMany({
    where: {
      active: true,
      isRecurring: true,
      daysOfWeek: { has: dow },
      startDate: { lte: tomorrow },
      OR: [{ endDate: null }, { endDate: { gte: tomorrow } }],
    },
    select: {
      id: true,
      departureTime: true,
      seats: true,
      price: true,
      driverId: true,
      origin: { select: { name: true, lat: true, lng: true } },
      destination: { select: { name: true, lat: true, lng: true } },
    },
  });

  if (templates.length === 0) {
    return { created: 0, date: tomorrow.toISOString().slice(0, 10) };
  }

  const existing = await prisma.trip.findMany({
    where: { date: tomorrow, routeTemplateId: { in: templates.map((t) => t.id) } },
    select: { routeTemplateId: true },
  });
  const existingIds = new Set(existing.map((t) => t.routeTemplateId));

  const toCreate = templates
    .filter((t) => !existingIds.has(t.id))
    .map((t) => {
      const departureTime = instantFromTomsk(tomorrow, t.departureTime);
      return {
        routeTemplateId: t.id,
        driverId: t.driverId,
        originName: t.origin.name,
        destName: t.destination.name,
        originLat: t.origin.lat,
        originLng: t.origin.lng,
        destLat: t.destination.lat,
        destLng: t.destination.lng,
        price: t.price,
        seatsTotal: t.seats,
        date: tomorrow,
        departureTime,
        status: "SCHEDULED" as const,
        availableSeats: t.seats,
      };
    });

  const result = await prisma.trip.createMany({ data: toCreate, skipDuplicates: true });
  return { created: result.count, date: tomorrow.toISOString().slice(0, 10) };
}

/** «Завтра едем?» — напоминание водителю о рейсе, который ждёт. */
export async function sendConfirmationReminders(): Promise<{ notified: number }> {
  const now = new Date();
  const horizon = new Date(now.getTime() + 26 * 60 * 60 * 1000); // «на завтра» с запасом
  let notified = 0;

  // Опубликованные поездки: напоминаем водителю и принятым пассажирам по одному разу
  const publishedTrips = await prisma.trip.findMany({
    where: { status: "CONFIRMED", routeTemplateId: null, departureTime: { gt: now, lte: horizon } },
    include: {
      ...tripDisplayInclude,
      bookings: { where: { status: "CONFIRMED" }, select: { passengerId: true } },
    },
    take: BATCH_LIMIT,
  });

  for (const trip of publishedTrips) {
    const route = tripRoute(trip);
    if (!route) continue;
    const time = formatTomskTime(trip.departureTime);

    const driverReminded = await prisma.notification.findFirst({
      where: { userId: route.driverId, type: "TRIP_REMINDER", relatedEntityId: trip.id },
      select: { id: true },
    });
    if (!driverReminded) {
      const title = "Завтра едем";
      const body = `${route.originName} → ${route.destName} в ${time}. Если планы поменялись, отмени поездку — пассажиры увидят.`;
      await prisma.notification.create({
        data: { userId: route.driverId, type: "TRIP_REMINDER", title, body, relatedEntityId: trip.id },
      });
      await sendNotificationToUser(route.driverId, createNotificationPayload(title, body, { url: "/profile/trips" })).catch(() => 0);
      notified += 1;
    }

    for (const booking of trip.bookings) {
      const passengerReminded = await prisma.notification.findFirst({
        where: { userId: booking.passengerId, type: "TRIP_REMINDER", relatedEntityId: trip.id },
        select: { id: true },
      });
      if (passengerReminded) continue;

      const title = "Завтра поездка";
      const body = `${route.originName} → ${route.destName} в ${time}. Встречаетесь на остановке с водителем.`;
      await prisma.notification.create({
        data: { userId: booking.passengerId, type: "TRIP_REMINDER", title, body, relatedEntityId: trip.id },
      });
      await sendNotificationToUser(booking.passengerId, createNotificationPayload(title, body, { url: "/profile/bookings" })).catch(() => 0);
      notified += 1;
    }
  }

  return { notified };
}

/** Если autoAccept = false и водитель не принял заявку до отправления — отменяем её. */
export async function expirePendingBookings(): Promise<{ expired: number }> {
  const now = new Date();

  const overdue = await prisma.booking.findMany({
    where: {
      status: "PENDING",
      trip: { departureTime: { lte: now } },
    },
    select: { id: true },
    take: BATCH_LIMIT,
  });

  let expired = 0;
  for (const booking of overdue) {
    const result = await cancelBooking(booking.id, "SYSTEM", now);
    if (result.cancelled) expired += 1;
  }

  return { expired };
}

/** Наступило время выезда — поездка в пути. */
export async function startConfirmedTrips(): Promise<{ started: number }> {
  const now = new Date();

  const trips = await prisma.trip.findMany({
    where: { status: { in: ["SCHEDULED", "CONFIRMED"] }, departureTime: { lte: now } },
    include: {
      ...tripDisplayInclude,
      bookings: {
        where: { status: { in: ["PENDING", "CONFIRMED"] } },
        select: { passengerId: true },
      },
    },
    take: BATCH_LIMIT,
  });

  let started = 0;
  for (const trip of trips) {
    const route = tripRoute(trip);
    if (!route) continue;

    const updated = await prisma.trip.updateMany({
      where: { id: trip.id, status: { in: ["SCHEDULED", "CONFIRMED"] } },
      data: { status: "IN_PROGRESS" },
    });
    if (updated.count === 0) continue;

    const body = `${route.originName} → ${route.destName}: поездка началась. Доброго пути!`;
    await sendNotificationToUsers(
      [route.driverId, ...trip.bookings.map((booking) => booking.passengerId)],
      createNotificationPayload("Поездка началась", body, { url: "/profile/bookings" })
    );
    started += 1;
  }

  return { started };
}

/** Поездки в пути дольше 3 часов — завершаем, закрываем брони, считаем поездку водителю. */
export async function completeTrips(): Promise<{ completed: number }> {
  const now = new Date();
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  const trips = await prisma.trip.findMany({
    where: { status: "IN_PROGRESS", departureTime: { lte: threeHoursAgo } },
    include: tripDisplayInclude,
    take: BATCH_LIMIT,
  });

  let completed = 0;
  for (const trip of trips) {
    const route = tripRoute(trip);
    if (!route) continue;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.trip.updateMany({
        where: { id: trip.id, status: "IN_PROGRESS" },
        data: { status: "COMPLETED" },
      });
      if (updated.count === 0) return null;

      const closed = await tx.booking.updateMany({
        where: { tripId: trip.id, status: { in: ["PENDING", "CONFIRMED"] } },
        data: { status: "COMPLETED" },
      });

      if (closed.count > 0) {
        await tx.driverProfile.updateMany({
          where: { userId: route.driverId },
          data: { totalRides: { increment: 1 } },
        });
      }

      const passengers = await tx.booking.findMany({
        where: { tripId: trip.id, status: "COMPLETED" },
        select: { passengerId: true },
      });

      return { passengers: passengers.map((booking) => booking.passengerId) };
    });

    if (!result) continue;

    await sendNotificationToUsers(
      [route.driverId, ...result.passengers],
      createNotificationPayload(
        "Поездка завершена",
        `${route.originName} → ${route.destName}: поездка завершена. Расскажи, как всё прошло.`,
        { url: "/profile/bookings" }
      )
    );
    completed += 1;
  }

  return { completed };
}

/** Суточная сводка Vercel Cron (план Hobby — один запуск в сутки). */
export async function runDailyMaintenance() {
  const expired = await expirePendingBookings();
  const started = await startConfirmedTrips();
  const completed = await completeTrips();
  const generated = await generateTomorrowTrips();
  const reminded = await sendConfirmationReminders();
  return {
    expired: expired.expired,
    started: started.started,
    completed: completed.completed,
    generated: generated.created,
    reminded: reminded.notified,
    date: generated.date,
  };
}
