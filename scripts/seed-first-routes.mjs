#!/usr/bin/env node
/**
 * Сид первых маршрутов для запуска (Этап 2).
 * Создаёт RouteTemplate на ключевых коридорах Томска:
 *  - Каштак → Площадь Ленина (будни, утро)
 *  - Зелёные Горки → ТГУ (будни, утро)
 *  - Академгородок → БЦ Мегаполис (будни, утро/вечер)
 *  - СибГМУ → Ж/Д вокзал Томск-1 (ежедневно, день)
 *  - Площадь Ленина → Каштак (будни, вечер)
 *  - ТГУ → Зелёные Горки (будни, вечер)
 *  - Ж/Д вокзал Томск-1 → Аэропорт (ежедневно, день)
 *  - БЦ Мегаполис → СибГМУ (будни, утро)
 *
 * Идемпотентен: не создаёт дубли при повторном запуске.
 *
 * Запуск: node --env-file=.env scripts/seed-first-routes.mjs
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL не задан");
  process.exit(1);
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: true } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// Ключевые коридоры: откуда → куда, время, дни, места, цена, комментарий
const CORRIDORS = [
  {
    origin: "Каштак",
    dest: "Площадь Ленина",
    time: "08:00",
    days: [1, 2, 3, 4, 5], // будни
    seats: 3,
    price: 100,
    comment: "Утренний рейс в центр. Беру попутчиков по пути.",
  },
  {
    origin: "Зелёные Горки",
    dest: "ТГУ",
    time: "08:15",
    days: [1, 2, 3, 4, 5], // будни
    seats: 2,
    price: 80,
    comment: "Еду в университет, места свободны.",
  },
  {
    origin: "Академгородок",
    dest: "БЦ Мегаполис",
    time: "08:30",
    days: [1, 2, 3, 4, 5], // будни
    seats: 3,
    price: 120,
    comment: "Рабочий маршрут, будни.",
  },
  {
    origin: "Академгородок",
    dest: "БЦ Мегаполис",
    time: "18:00",
    days: [1, 2, 3, 4, 5], // будни
    seats: 3,
    price: 120,
    comment: "Обратный рейс вечером.",
  },
  {
    origin: "СибГМУ",
    dest: "Ж/Д вокзал Томск-1",
    time: "14:00",
    days: [1, 2, 3, 4, 5, 6, 7], // ежедневно
    seats: 2,
    price: 150,
    comment: "Дневной рейс до вокзала.",
  },
  {
    origin: "Площадь Ленина",
    dest: "Каштак",
    time: "18:00",
    days: [1, 2, 3, 4, 5], // будни
    seats: 3,
    price: 100,
    comment: "Вечерний рейс из центра домой.",
  },
  {
    origin: "ТГУ",
    dest: "Зелёные Горки",
    time: "17:30",
    days: [1, 2, 3, 4, 5], // будни
    seats: 2,
    price: 80,
    comment: "Из университета домой после занятий.",
  },
  {
    origin: "Ж/Д вокзал Томск-1",
    dest: "Аэропорт",
    time: "12:00",
    days: [1, 2, 3, 4, 5, 6, 7], // ежедневно
    seats: 3,
    price: 200,
    comment: "Из вокзала в аэропорт, багажное место есть.",
  },
  {
    origin: "БЦ Мегаполис",
    dest: "СибГМУ",
    time: "08:00",
    days: [1, 2, 3, 4, 5], // будни
    seats: 3,
    price: 100,
    comment: "Утренний рейс из БЦ в университет.",
  },
  {
    origin: "Южные Ворота",
    dest: "ТПУ",
    time: "08:00",
    days: [1, 2, 3, 4, 5], // будни
    seats: 2,
    price: 90,
    comment: "Из Южных Ворот в ТПУ по утрам.",
  },
];

async function main() {
  // Находим водителя Dmitry (DRIVER) или создаём DriverProfile для первого подходящего
  const driver = await prisma.user.findFirst({
    where: { role: "DRIVER", status: "ACTIVE" },
    select: { id: true, login: true, firstName: true, lastName: true },
  });

  if (!driver) {
    console.error("Не найден пользователь с ролью DRIVER. Сначала создайте водителя через /driver");
    process.exit(1);
  }

  console.log(`Водитель: ${driver.login} (${driver.id})`);

  // Проверяем DriverProfile
  let profile = await prisma.driverProfile.findUnique({
    where: { userId: driver.id },
  });
  if (!profile) {
    profile = await prisma.driverProfile.create({
      data: {
        userId: driver.id,
        carModel: "Hyundai Solaris",
        carNumber: "Т707АА 70",
        carColor: "белый",
      },
    });
    console.log(`Создан DriverProfile для ${driver.login}`);
  } else {
    console.log(`DriverProfile уже существует: ${profile.carModel} ${profile.carNumber}`);
  }

  // Получаем CityPoint по именам
  const pointCache = new Map();
  async function getPointId(name) {
    if (pointCache.has(name)) return pointCache.get(name);
    const point = await prisma.cityPoint.findUnique({ where: { name } });
    if (!point) {
      console.error(`CityPoint не найден: ${name}`);
      return null;
    }
    pointCache.set(name, point.id);
    return point.id;
  }

  let created = 0;
  let skipped = 0;

  for (const corridor of CORRIDORS) {
    const originId = await getPointId(corridor.origin);
    const destId = await getPointId(corridor.dest);
    if (!originId || !destId) {
      console.log(`Пропуск: ${corridor.origin} → ${corridor.dest} (точка не найдена)`);
      skipped++;
      continue;
    }

    // Проверяем дубликат: тот же водитель, те же точки, то же время
    const existing = await prisma.routeTemplate.findFirst({
      where: {
        driverId: driver.id,
        originId,
        destId,
        departureTime: corridor.time,
      },
    });
    if (existing) {
      console.log(`Уже существует: ${corridor.origin} → ${corridor.dest} ${corridor.time}`);
      skipped++;
      continue;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await prisma.routeTemplate.create({
      data: {
        driverId: driver.id,
        originId,
        destId,
        departureTime: corridor.time,
        timezone: "Asia/Tomsk",
        daysOfWeek: corridor.days,
        startDate: tomorrow,
        seats: corridor.seats,
        price: corridor.price,
        serviceFee: 0,
        isRecurring: true,
        active: true,
        notes: corridor.comment,
      },
    });
    console.log(`Создано: ${corridor.origin} → ${corridor.dest} ${corridor.time} (${corridor.seats} мест, ${corridor.price} ₽)`);
    created++;
  }

  console.log(`\nИтого: создано ${created}, пропущено ${skipped} из ${CORRIDORS.length}`);
}

main()
  .catch((error) => {
    console.error("Сид упал:", error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
    await prisma.$disconnect();
  });
