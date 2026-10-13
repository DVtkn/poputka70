/**
 * Сид для локальной/тестовой базы.
 * Идемпотентен: создаёт точки, точки встреч и админа, если их ещё нет.
 * Полная очистка таблиц — только с флагом --reset.
 *
 * Запуск: npm run db:seed  (или npx tsx prisma/seed.ts [--reset])
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL не задан");
  process.exit(1);
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: true } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const RESET = process.argv.includes("--reset");

const CITY_POINTS: Array<{
  name: string;
  type: "ORIGIN" | "DESTINATION" | "BOTH";
  category: "RESIDENTIAL" | "CENTER" | "UNIVERSITY" | "BUSINESS" | "TRANSPORT";
  lat: number;
  lng: number;
}> = [
  { name: "Южные Ворота", type: "ORIGIN", category: "RESIDENTIAL", lat: 56.44, lng: 85.055 },
  { name: "Каштак", type: "ORIGIN", category: "RESIDENTIAL", lat: 56.515, lng: 85.015 },
  { name: "Зелёные Горки", type: "ORIGIN", category: "RESIDENTIAL", lat: 56.52, lng: 85.005 },
  { name: "Спартанская", type: "ORIGIN", category: "RESIDENTIAL", lat: 56.512, lng: 85.03 },
  { name: "Аэропорт", type: "ORIGIN", category: "TRANSPORT", lat: 56.383, lng: 85.21 },
  { name: "Площадь Ленина", type: "BOTH", category: "CENTER", lat: 56.4977, lng: 84.9481 },
  { name: "Новособорная", type: "BOTH", category: "CENTER", lat: 56.4918, lng: 84.9486 },
  { name: "Лагерный сад", type: "BOTH", category: "CENTER", lat: 56.472, lng: 84.949 },
  { name: "ТГУ", type: "DESTINATION", category: "UNIVERSITY", lat: 56.4693, lng: 84.9478 },
  { name: "ТПУ", type: "DESTINATION", category: "UNIVERSITY", lat: 56.4653, lng: 84.9505 },
  { name: "СибГМУ", type: "DESTINATION", category: "UNIVERSITY", lat: 56.475, lng: 84.937 },
  { name: "ТУСУР", type: "DESTINATION", category: "UNIVERSITY", lat: 56.4617, lng: 84.9373 },
  { name: "Ж/Д вокзал Томск-1", type: "BOTH", category: "TRANSPORT", lat: 56.4785, lng: 84.9153 },
  { name: "БЦ Мегаполис", type: "BOTH", category: "BUSINESS", lat: 56.4887, lng: 84.968 },
  { name: "Изумрудный город", type: "BOTH", category: "BUSINESS", lat: 56.526, lng: 85.008 },
];

async function reset(): Promise<void> {
  console.log("Очищаю таблицы (--reset)…");
  await prisma.demandRequest.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.routeTemplate.deleteMany();
  await prisma.meetingPoint.deleteMany();
  await prisma.driverProfile.deleteMany();
  await prisma.cityPoint.deleteMany();
  await prisma.user.deleteMany();
}

async function main(): Promise<void> {
  if (RESET) await reset();

  for (const point of CITY_POINTS) {
    const existing = await prisma.cityPoint.findUnique({ where: { name: point.name } });
    if (existing) continue;
    await prisma.cityPoint.create({
      data: {
        ...point,
        meetingPoints: {
          create: {
            name: point.name,
            lat: point.lat,
            lng: point.lng,
            landmark: `Главный вход: ${point.name}`,
            instruction: "Ждите у остановки или главного входа",
          },
        },
      },
    });
  }
  const pointsCount = await prisma.cityPoint.count();
  const meetingCount = await prisma.meetingPoint.count();
  console.log(`Точки города: ${pointsCount}, точки встреч: ${meetingCount}`);

  const adminLogin = process.env.SEED_ADMIN_LOGIN || "admin";
  const existingAdmin = await prisma.user.findUnique({ where: { login: adminLogin } });
  if (!existingAdmin) {
    const generatedPassword = process.env.SEED_ADMIN_PASSWORD || randomBytes(9).toString("base64url");
    await prisma.user.create({
      data: {
        login: adminLogin,
        passwordHash: await bcrypt.hash(generatedPassword, 10),
        firstName: "Админ",
        lastName: "Попутка70",
        role: "ADMIN",
        status: "ACTIVE",
        authProvider: "PASSWORD",
      },
    });
    console.log(`Создан администратор «${adminLogin}»`);
    if (!process.env.SEED_ADMIN_PASSWORD) {
      console.log(`Пароль (сохрани и смени после входа): ${generatedPassword}`);
    }
  } else {
    console.log(`Администратор «${adminLogin}» уже существует — пропускаю`);
  }

  console.log("Сид завершён.");
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
