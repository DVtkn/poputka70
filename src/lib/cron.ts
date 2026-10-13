import { prisma } from "@/lib/prisma";
import { sendNotificationToUser, sendNotificationToUsers, createNotificationPayload } from "@/lib/push";
import { cancelBooking } from "@/lib/bookings";
import { addDaysUtc, dayOfWeekUtc, formatTomskTime, instantFromTomsk, tomskTodayUtc } from "@/lib/time";

const BATCH_LIMIT = 200;

async function pushToUsers(userIds: string[], payload: object): Promise<void> {
  await sendNotificationToUsers(userIds, payload);
}

/** Создаёт рейсы на завтра по всем активным шаблонам маршрутов. Идемпотентно. */
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
    select: { id: true, departureTime: true, seats: true },
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
        date: tomorrow,
        departureTime,
        status: "SCHEDULED" as const,
        availableSeats: t.seats,
        confirmationDeadline: new Date(departureTime.getTime() - 60 * 60 * 1000),
      };
    });

  const result = await prisma.trip.createMany({ data: toCreate, skipDuplicates: true });
  return { created: result.count, date: tomorrow.toISOString().slice(0, 10) };
}

/** Напоминание водителю за ~2 часа до отправления. */
export async function sendConfirmationReminders(): Promise<{ notified: number }> {
  const now = new Date();
  const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const trips = await prisma.trip.findMany({
    where: {
      status: "SCHEDULED",
      driverConfirmed: false,
      departureTime: { gt: now, lte: inTwoHours },
    },
    include: {
      routeTemplate: {
        select: {
          driverId: true,
          origin: { select: { name: true } },
          destination: { select: { name: true } },
        },
      },
    },
    take: BATCH_LIMIT,
  });

  let notified = 0;
  for (const trip of trips) {
    const deadline = new Date(trip.departureTime.getTime() - 60 * 60 * 1000);
    const updated = await prisma.trip.updateMany({
      where: { id: trip.id, status: "SCHEDULED" },
      data: { status: "PENDING_CONFIRMATION", confirmationDeadline: deadline },
    });
    if (updated.count === 0) continue;

    const route = `${trip.routeTemplate.origin.name} → ${trip.routeTemplate.destination.name}`;
    const time = formatTomskTime(trip.departureTime);
    const title = "Ты сегодня едешь?";
    const body = `Поездка ${route} в ${time}. Подтверди или отмени за 60 минут до отправления.`;

    await prisma.notification.create({
      data: {
        userId: trip.routeTemplate.driverId,
        type: "TRIP_CONFIRMATION_NEEDED",
        title,
        body,
        relatedEntityId: trip.id,
      },
    });
    await sendNotificationToUser(
      trip.routeTemplate.driverId,
      createNotificationPayload(title, body, { url: "/profile/trips" })
    ).catch(() => 0);
    notified += 1;
  }

  return { notified };
}

/**
 * Просроченные подтверждения: PENDING_CONFIRMATION с истёкшим дедлайном
 * и рейсы, которые так и не подтвердили до отправления → UNCONFIRMED,
 * активные брони снимаются, места возвращаются.
 */
export async function processConfirmationDeadlines(): Promise<{ processed: number }> {
  const now = new Date();

  const trips = await prisma.trip.findMany({
    where: {
      OR: [
        { status: "PENDING_CONFIRMATION", confirmationDeadline: { lte: now } },
        { status: "SCHEDULED", driverConfirmed: false, departureTime: { lte: now } },
      ],
    },
    include: {
      routeTemplate: {
        select: {
          driverId: true,
          origin: { select: { name: true } },
          destination: { select: { name: true } },
        },
      },
    },
    take: BATCH_LIMIT,
  });

  let processed = 0;
  for (const trip of trips) {
    const updated = await prisma.trip.updateMany({
      where: { id: trip.id, status: { in: ["SCHEDULED", "PENDING_CONFIRMATION"] } },
      data: { status: "UNCONFIRMED" },
    });
    if (updated.count === 0) continue;

    const activeBookings = await prisma.booking.findMany({
      where: { tripId: trip.id, status: { in: ["PENDING", "CONFIRMED"] } },
      select: { id: true, passengerId: true },
    });

    for (const booking of activeBookings) {
      await cancelBooking(booking.id, "SYSTEM", now);
    }

    const route = `${trip.routeTemplate.origin.name} → ${trip.routeTemplate.destination.name}`;
    const title = "Поездка не подтверждена";
    const body = `Поездка ${route} отменена: водитель не подтвердил её вовремя. Бронирования сняты.`;

    await prisma.notification.create({
      data: {
        userId: trip.routeTemplate.driverId,
        type: "TRIP_UNCONFIRMED",
        title,
        body,
        relatedEntityId: trip.id,
      },
    });
    await pushToUsers(
      [trip.routeTemplate.driverId, ...activeBookings.map((b) => b.passengerId)],
      createNotificationPayload(title, body, { url: "/profile/trips" })
    );

    processed += 1;
  }

  return { processed };
}

/** Подтверждённые рейсы, время которых наступило → IN_PROGRESS + уведомления. */
export async function startConfirmedTrips(): Promise<{ started: number }> {
  const now = new Date();

  const trips = await prisma.trip.findMany({
    where: { status: "CONFIRMED", departureTime: { lte: now } },
    include: {
      routeTemplate: {
        select: {
          driverId: true,
          origin: { select: { name: true } },
          destination: { select: { name: true } },
        },
      },
      bookings: {
        where: { status: { in: ["PENDING", "CONFIRMED"] } },
        select: { passengerId: true },
      },
    },
    take: BATCH_LIMIT,
  });

  let started = 0;
  for (const trip of trips) {
    const updated = await prisma.trip.updateMany({
      where: { id: trip.id, status: "CONFIRMED" },
      data: { status: "IN_PROGRESS" },
    });
    if (updated.count === 0) continue;

    const route = `${trip.routeTemplate.origin.name} → ${trip.routeTemplate.destination.name}`;
    await pushToUsers(
      [trip.routeTemplate.driverId, ...trip.bookings.map((b) => b.passengerId)],
      createNotificationPayload("Поездка началась", `Ваша поездка ${route} началась. Доброго пути!`, {
        url: "/profile/bookings",
      })
    );
    started += 1;
  }

  return { started };
}

/** Рейсы в пути дольше 3 часов → COMPLETED, брони закрываются, поездки водителя учитываются. */
export async function completeTrips(): Promise<{ completed: number }> {
  const now = new Date();
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  const trips = await prisma.trip.findMany({
    where: { status: "IN_PROGRESS", departureTime: { lte: threeHoursAgo } },
    include: {
      routeTemplate: {
        select: {
          driverId: true,
          origin: { select: { name: true } },
          destination: { select: { name: true } },
        },
      },
    },
    take: BATCH_LIMIT,
  });

  let completed = 0;
  for (const trip of trips) {
    const driverId = trip.routeTemplate.driverId;

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
          where: { userId: driverId },
          data: { totalRides: { increment: 1 } },
        });
      }

      const passengers = await tx.booking.findMany({
        where: { tripId: trip.id, status: "COMPLETED" },
        select: { passengerId: true },
      });

      return { passengers: passengers.map((b) => b.passengerId) };
    });

    if (!result) continue;

    const route = `${trip.routeTemplate.origin.name} → ${trip.routeTemplate.destination.name}`;
    await pushToUsers(
      [driverId, ...result.passengers],
      createNotificationPayload(
        "Поездка завершена",
        `Поездка ${route} завершена. Не забудьте оставить отзыв!`,
        { url: "/profile/bookings" }
      )
    );
    completed += 1;
  }

  return { completed };
}

/** Снимает неоплаченные брони с истёкшим дедлайном оплаты. */
export async function expireUnpaidBookings(): Promise<{ expired: number }> {
  const now = new Date();

  const overdue = await prisma.booking.findMany({
    where: { status: "PENDING", serviceFeeStatus: "PENDING", paymentDeadline: { lte: now } },
    select: { id: true },
    take: BATCH_LIMIT,
  });

  let expired = 0;
  for (const booking of overdue) {
    const result = await cancelBooking(booking.id, "EXPIRED", now);
    if (result.cancelled) expired += 1;
  }

  return { expired };
}

/**
 * Ежедневная сводка для Vercel Cron (план Hobby — один запуск в сутки):
 * закрываем вчерашние рейсы, снимаем неоплаченные брони и создаём рейсы на завтра.
 * Частые задачи (напоминания, дедлайны) гоняет внешний планировщик — см. README.
 */
export async function runDailyMaintenance() {
  const expired = await expireUnpaidBookings();
  const deadlines = await processConfirmationDeadlines();
  const started = await startConfirmedTrips();
  const completed = await completeTrips();
  const generated = await generateTomorrowTrips();
  return {
    expired: expired.expired,
    deadlines: deadlines.processed,
    started: started.started,
    completed: completed.completed,
    generated: generated.created,
    date: generated.date,
  };
}
