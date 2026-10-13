#!/usr/bin/env node
/**
 * Сквозной smoke-тест прод-контура:
 * health → автодополнение остановок → регистрация → водитель → маршрут →
 * генерация рейса (cron) → поиск по остановкам → бронь → списание места →
 * отмена брони → возврат места. Тестовые данные удаляются в конце (Neon HTTP).
 *
 * Запуск:
 *   BASE_URL=https://poputka70.vercel.app CRON_SECRET=... node --env-file=.env scripts/smoke-prod.mjs
 */
import { neon } from "@neondatabase/serverless";

const BASE = process.env.BASE_URL || "https://poputka70.vercel.app";
const CRON_SECRET = process.env.CRON_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;

if (!CRON_SECRET) {
  console.error("CRON_SECRET не задан — возьми значение из Vercel → Settings → Environment Variables.");
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error("DATABASE_URL не задан (нужен для уборки тестовых данных).");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

let passed = 0;
let failed = 0;

function report(name, ok, detail = "") {
  const mark = ok ? "✅" : "❌";
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ""}`);
  if (ok) passed += 1;
  else failed += 1;
}

async function api(path, options = {}) {
  const { method = "GET", body, cookie, auth } = options;
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (auth) headers.Authorization = `Bearer ${auth}`;

  let payload;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const response = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  const setCookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  const sessionCookie = setCookies.map((value) => value.split(";")[0]).find((value) => value.startsWith("session="));
  const data = await response.json().catch(() => null);
  return { status: response.status, data, cookie: sessionCookie };
}

const stamp = Date.now().toString(36);
const driverLogin = `smoke-${stamp}-driver`;
const passengerLogin = `smoke-${stamp}-passenger`;
const PASSWORD = `Smoke-${stamp}-Pass1`;

async function cleanup() {
  await sql.query(`DELETE FROM "User" WHERE login LIKE 'smoke-%'`);
}

try {
  // 1. Health
  const health = await api("/api/health");
  report("health", health.status === 200 && health.data?.status === "ok");

  // 2. Автодополнение остановок
  const stops = await api(`/api/stops?query=${encodeURIComponent("сибг")}`);
  const stopFound = (stops.data?.stops ?? []).some((stop) => /сибг/i.test(stop.name));
  report("автодополнение остановок («сибг» → СибГМУ)", stops.status === 200 && stopFound);

  // 3. Регистрация водителя
  const driverReg = await api("/api/auth/register", {
    method: "POST",
    body: { login: driverLogin, password: PASSWORD, firstName: "Смоук", lastName: "Водитель" },
  });
  report("регистрация водителя", driverReg.status === 200 && driverReg.data?.success === true, driverLogin);

  // 4. Профиль водителя
  const driverProfile = await api("/api/driver/register", {
    method: "POST",
    cookie: driverReg.cookie,
    body: { carModel: "Smoke Car", carNumber: "А000АА70", carColor: "Белый" },
  });
  report("профиль водителя", driverProfile.status === 200 && driverProfile.data?.success === true);

  // 5. Точки маршрута
  const points = await api("/api/city-points");
  const allPoints = points.data?.points ?? [];
  const origin = allPoints.find((point) => point.name === "БЦ Мегаполис") ?? allPoints[0];
  const dest = allPoints.find((point) => point.name === "СибГМУ") ?? allPoints[1];
  report("справочник точек", Boolean(origin && dest), `${origin?.name} → ${dest?.name}`);

  // 6. Маршрут
  const routeRes = await api("/api/routes", {
    method: "POST",
    cookie: driverReg.cookie,
    body: {
      originId: origin.id,
      destId: dest.id,
      departureTime: "09:30",
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
      seats: 2,
      price: 100,
    },
  });
  const routeId = routeRes.data?.route?.id;
  report("создание маршрута", routeRes.status === 200 && Boolean(routeId));

  // 7. Генерация рейсов кроном
  const cron = await api("/api/cron/generate-trips", { auth: CRON_SECRET });
  report("генерация рейсов (cron)", cron.status === 200 && cron.data?.success === true, `создано: ${cron.data?.created}`);

  // 8. Поиск по остановкам
  const search = await api(
    `/api/routes?from=${encodeURIComponent(origin.name)}&to=${encodeURIComponent(dest.name)}`
  );
  const found = (search.data?.routes ?? []).find((route) => route.id === routeId);
  const trip = found?.nextTrips?.[0];
  report("маршрут виден в поиске", Boolean(found && trip), trip ? `рейс ${trip.id}` : "рейс не найден");
  if (!trip) throw new Error("нет рейса для бронирования");

  const seatsBefore = trip.availableSeats;

  // 9. Регистрация пассажира и бронь
  const passengerReg = await api("/api/auth/register", {
    method: "POST",
    body: { login: passengerLogin, password: PASSWORD, firstName: "Смоук", lastName: "Пассажир" },
  });
  report("регистрация пассажира", passengerReg.status === 200 && passengerReg.data?.success === true);

  const booking = await api("/api/bookings", {
    method: "POST",
    cookie: passengerReg.cookie,
    body: { tripId: trip.id },
  });
  const bookingId = booking.data?.booking?.id;
  report("бронь места", booking.status === 200 && Boolean(bookingId));

  // 10. Место списано
  const afterBooking = await api(
    `/api/routes?from=${encodeURIComponent(origin.name)}&to=${encodeURIComponent(dest.name)}`
  );
  const tripAfter = (afterBooking.data?.routes ?? [])
    .find((route) => route.id === routeId)
    ?.nextTrips?.find((t) => t.id === trip.id);
  report("место списано", tripAfter?.availableSeats === seatsBefore - 1, `${seatsBefore} → ${tripAfter?.availableSeats}`);

  // 11. Отмена брони
  const cancel = await api(`/api/bookings/${bookingId}/cancel`, { method: "POST", cookie: passengerReg.cookie });
  report("отмена брони", cancel.status === 200 && cancel.data?.cancelled === true);

  // 12. Место вернулось
  const afterCancel = await api(
    `/api/routes?from=${encodeURIComponent(origin.name)}&to=${encodeURIComponent(dest.name)}`
  );
  const tripFinal = (afterCancel.data?.routes ?? [])
    .find((route) => route.id === routeId)
    ?.nextTrips?.find((t) => t.id === trip.id);
  report("место возвращено", tripFinal?.availableSeats === seatsBefore, `${tripFinal?.availableSeats} мест`);
} catch (error) {
  failed += 1;
  console.error("❌ Выполнение прервано:", error instanceof Error ? error.message : error);
} finally {
  try {
    await cleanup();
    console.log("🧹 Тестовые данные удалены");
  } catch (error) {
    console.error("Не удалось удалить тестовые данные:", error instanceof Error ? error.message : error);
  }
  console.log(`\nИтог: ${passed} ok, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
