import { prisma } from "@/lib/prisma";
import { sendNotificationToUser, createNotificationPayload } from "@/lib/push";

const TOMKSK_TIMEZONE = "Asia/Tomsk";

function getTomskNow(): Date {
  const now = new Date();
  const tomskOffset = 7 * 60;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + tomskOffset * 60000);
}

function getTomskDate(): Date {
  const tomsk = getTomskNow();
  return new Date(Date.UTC(tomsk.getUTCFullYear(), tomsk.getUTCMonth(), tomsk.getUTCDate()));
}

export async function generateTomorrowTrips() {
  const tomorrow = new Date(getTomskDate());
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const dayOfWeek = tomorrow.getUTCDay() === 0 ? 7 : tomorrow.getUTCDay();

  const templates = await prisma.routeTemplate.findMany({
    where: {
      active: true,
      isRecurring: true,
      daysOfWeek: { has: dayOfWeek },
      startDate: { lte: tomorrow },
      OR: [{ endDate: null }, { endDate: { gte: tomorrow } }],
    },
    include: { driver: { select: { id: true } } },
  });

  let created = 0;
  for (const tmpl of templates) {
    const exists = await prisma.trip.findUnique({
      where: { routeTemplateId_date: { routeTemplateId: tmpl.id, date: tomorrow } },
    });
    if (exists) continue;

    const [hours, minutes] = tmpl.departureTime.split(":").map(Number);
    const departureTime = new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), hours, minutes));
    const confirmationDeadline = new Date(departureTime.getTime() - 60 * 60 * 1000);

    await prisma.trip.create({
      data: {
        routeTemplateId: tmpl.id,
        date: tomorrow,
        departureTime,
        status: "SCHEDULED",
        availableSeats: tmpl.seats,
        confirmationDeadline,
      },
    });
    created++;
  }

  return { created, date: tomorrow.toISOString().split("T")[0] };
}

export async function processConfirmationDeadlines() {
  const now = new Date();
  const trips = await prisma.trip.findMany({
    where: {
      status: "PENDING_CONFIRMATION",
      confirmationDeadline: { lte: now },
    },
    include: { routeTemplate: { select: { driverId: true, origin: true, destination: true } } },
  });

  let processed = 0;
  for (const trip of trips) {
    await prisma.trip.update({
      where: { id: trip.id },
      data: { status: "UNCONFIRMED" },
    });
    await prisma.booking.updateMany({
      where: { tripId: trip.id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    await prisma.notification.create({
      data: {
        userId: trip.routeTemplate.driverId,
        type: "TRIP_UNCONFIRMED",
        title: "Поездка не подтверждена",
        body: `Поездка ${trip.routeTemplate.origin.name} → ${trip.routeTemplate.destination.name} не подтверждена до дедлайна и отменена. Брони пассажиров отменены.`,
        relatedEntityId: trip.id,
      },
    });
    await sendNotificationToUser(trip.routeTemplate.driverId, createNotificationPayload(
      "Поездка не подтверждена",
      "Водитель не подтвердил поездку вовремя. Бронирования отменены.",
      { url: "/profile/trips" }
    ));

    // уведомляем пассажиров об отмене
    const passengers = await prisma.booking.findMany({
      where: { tripId: trip.id, status: { in: ["PENDING", "CONFIRMED"] } },
      select: { passengerId: true },
    });
    await prisma.notification.createMany({
      data: passengers.map((b) => ({
        userId: b.passengerId,
        type: "TRIP_UNCONFIRMED",
        title: "Поездка отменена",
        body: `Водитель не подтвердил поездку ${trip.routeTemplate.origin.name} → ${trip.routeTemplate.destination.name}. Бронирование отменено.`,
        relatedEntityId: trip.id,
      })),
    });

    processed++;
  }

  return { processed };
}

export async function startConfirmedTrips() {
  const now = new Date();
  const trips = await prisma.trip.findMany({
    where: { status: "CONFIRMED", departureTime: { lte: now } },
    include: { routeTemplate: { select: { driverId: true, origin: true, destination: true } } },
  });

  let started = 0;
  for (const trip of trips) {
    await prisma.trip.update({
      where: { id: trip.id },
      data: { status: "IN_PROGRESS" },
    });
    await sendNotificationToUser(trip.routeTemplate.driverId, createNotificationPayload(
      "Поездка началась",
      `Поездка ${trip.routeTemplate.origin.name} → ${trip.routeTemplate.destination.name} началась. Доброго пути!`,
      { url: "/profile/trips" }
    ));
    for (const booking of await prisma.booking.findMany({ where: { tripId: trip.id, status: "CONFIRMED" }, select: { passengerId: true } })) {
      await sendNotificationToUser(booking.passengerId, createNotificationPayload(
        "Поездка началась",
        `Ваша поездка ${trip.routeTemplate.origin.name} → ${trip.routeTemplate.destination.name} началась.`,
        { url: "/profile/bookings" }
      ));
    }
    started++;
  }
  return { started };
}

export async function completeTrips() {
  const now = new Date();
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const trips = await prisma.trip.findMany({
    where: { status: "IN_PROGRESS", departureTime: { lte: threeHoursAgo } },
    include: { routeTemplate: { select: { driverId: true, origin: true, destination: true } } },
  });

  let completed = 0;
  for (const trip of trips) {
    await prisma.trip.update({
      where: { id: trip.id },
      data: { status: "COMPLETED" },
    });
    await sendNotificationToUser(trip.routeTemplate.driverId, createNotificationPayload(
      "Поездка завершена",
      `Поездка ${trip.routeTemplate.origin.name} → ${trip.routeTemplate.destination.name} завершена. Не забудьте оставить отзыв!`,
      { url: "/profile/trips" }
    ));
    for (const booking of await prisma.booking.findMany({ where: { tripId: trip.id, status: "CONFIRMED" }, select: { passengerId: true } })) {
      await sendNotificationToUser(booking.passengerId, createNotificationPayload(
        "Поездка завершена",
        `Ваша поездка ${trip.routeTemplate.origin.name} → ${trip.routeTemplate.destination.name} завершена. Оцените водителя!`,
        { url: "/profile/bookings" }
      ));
    }
    completed++;
  }
  return { completed };
}

export async function sendConfirmationReminders() {
  const now = new Date();
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const trips = await prisma.trip.findMany({
    where: {
      status: "SCHEDULED",
      departureTime: { gte: now, lte: twoHoursFromNow },
    },
    include: {
      routeTemplate: { 
        include: { 
          driver: { select: { id: true } },
          origin: { select: { name: true } },
          destination: { select: { name: true } },
        } 
      },
    },
  });

  for (const trip of trips) {
    await prisma.trip.update({
      where: { id: trip.id },
      data: {
        status: "PENDING_CONFIRMATION",
        confirmationDeadline: new Date(trip.departureTime.getTime() - 60 * 60 * 1000),
      },
    });

    await prisma.notification.create({
      data: {
        userId: trip.routeTemplate.driverId,
        type: "TRIP_CONFIRMATION_NEEDED",
        title: "Ты сегодня едешь?",
        body: `Твоя поездка ${trip.routeTemplate.origin.name} → ${trip.routeTemplate.destination.name} в ${trip.departureTime.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: TOMKSK_TIMEZONE })}. Подтверди или отмени за 60 мин до отправления.`,
        relatedEntityId: trip.id,
      },
    });

    await sendNotificationToUser(trip.routeTemplate.driverId, createNotificationPayload(
      "Ты сегодня едешь?",
      `Твоя поездка ${trip.routeTemplate.origin.name} → ${trip.routeTemplate.destination.name} в ${trip.departureTime.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: TOMKSK_TIMEZONE })}. Подтверди или отмени за 60 мин.`,
      { url: "/profile/trips" }
    ));
  }

  return { notified: trips.length };
}