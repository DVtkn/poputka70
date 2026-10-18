#!/usr/bin/env node
/**
 * Сквозной smoke «Попутки 2.0» на проде:
 * health → подсказки остановок → водитель → публикация поездки → поиск по коридору →
 * заявка пассажира → принятие водителем → снятие заявки → возврат места.
 * Тестовые данные удаляются в конце (Neon HTTP).
 *
 * Запуск: BASE_URL=https://poputka70.vercel.app node --env-file=.env scripts/smoke-prod.mjs
 */
import { neon } from "@neondatabase/serverless";

const BASE = process.env.BASE_URL || "https://poputka70.vercel.app";
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL не задан (нужен для уборки тестовых данных).");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
let passed = 0;
let failed = 0;

function report(name, ok, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (ok) passed += 1;
  else failed += 1;
}

async function api(path, options = {}) {
  const { method = "GET", body, cookie } = options;
  const headers = {};
  if (cookie) headers.cookie = cookie;

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

function tomskDate(offsetDays) {
  return new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toLocaleDateString("en-CA", {
    timeZone: "Asia/Tomsk",
  });
}

try {
  // 1. Health
  const health = await api("/api/health");
  report("health", health.status === 200 && health.data?.status === "ok");

  // 2. Подсказки остановок (ориентиры + справочник)
  const stopsA = await api(`/api/stops?query=${encodeURIComponent("Площадь Ленина")}&limit=5`);
  const stopsB = await api(`/api/stops?query=${encodeURIComponent("Лагерный")}&limit=5`);
  const pickStop = (list, needle) =>
    (list ?? []).find((stop) => stop.kind === "stop" && stop.name.includes(needle)) ??
    (list ?? []).find((stop) => stop.name.includes(needle));
  const originStop = pickStop(stopsA.data?.stops, "Площадь Ленина");
  const destStop = pickStop(stopsB.data?.stops, "Лагерный");
  report(
    "подсказки остановок",
    Boolean(originStop && destStop),
    originStop && destStop ? `${originStop.name} → ${destStop.name}` : "не нашлись"
  );
  if (!originStop || !destStop) throw new Error("нет точек для публикации");

  // 3. Водитель
  const driverReg = await api("/api/auth/register", {
    method: "POST",
    body: { login: driverLogin, password: PASSWORD, firstName: "Смоук", lastName: "Водитель" },
  });
  report("регистрация водителя", driverReg.status === 200 && driverReg.data?.success === true);

  const driverProfile = await api("/api/driver/register", {
    method: "POST",
    cookie: driverReg.cookie,
    body: { carModel: "Smoke Car", carNumber: "А000АА70", carColor: "Белый" },
  });
  report("профиль водителя", driverProfile.status === 200 && driverProfile.data?.success === true);

  // 4. Публикация поездки
  const publish = await api("/api/trips", {
    method: "POST",
    cookie: driverReg.cookie,
    body: {
      origin: { name: originStop.name, lat: originStop.lat, lng: originStop.lng },
      dest: { name: destStop.name, lat: destStop.lat, lng: destStop.lng },
      date: tomskDate(1),
      time: "09:40",
      seats: 2,
      price: 100,
      comment: "Смоук-поездка",
      repeat: "none",
      autoAccept: false,
    },
  });
  report("публикация поездки", publish.status === 200 && publish.data?.created >= 1, `создано: ${publish.data?.created}`);

  // 5. Поиск по коридору
  const search = await api(
    `/api/trips?from=${encodeURIComponent(originStop.name)}&to=${encodeURIComponent(destStop.name)}`
  );
  const trip = (search.data?.trips ?? [])[0];
  report("поездка видна в поиске", Boolean(trip), trip ? `мест: ${trip.seatsLeft}` : "не найдена");
  if (!trip) throw new Error("поездка не найдена в поиске");
  const seatsBefore = trip.seatsLeft;

  // 6. Заявка пассажира
  const passengerReg = await api("/api/auth/register", {
    method: "POST",
    body: { login: passengerLogin, password: PASSWORD, firstName: "Смоук", lastName: "Пассажир" },
  });
  report("регистрация пассажира", passengerReg.status === 200 && passengerReg.data?.success === true);

  const booking = await api("/api/bookings", {
    method: "POST",
    cookie: passengerReg.cookie,
    body: { tripId: trip.id, note: "Смоук-заявка" },
  });
  const bookingId = booking.data?.booking?.id;
  report("заявка на место", booking.status === 200 && Boolean(bookingId), `сумма: ${booking.data?.booking?.amount} ₽`);

  // 7. Место придержано
  const afterBooking = await api(
    `/api/trips?from=${encodeURIComponent(originStop.name)}&to=${encodeURIComponent(destStop.name)}`
  );
  const tripAfter = (afterBooking.data?.trips ?? []).find((item) => item.id === trip.id);
  report("место придержано", tripAfter?.seatsLeft === seatsBefore - 1, `${seatsBefore} → ${tripAfter?.seatsLeft}`);

  // 8. Водитель принимает
  const accept = await api(`/api/bookings/${bookingId}/accept`, { method: "POST", cookie: driverReg.cookie });
  report("водитель принял", accept.status === 200 && accept.data?.accepted === true);

  const passengerBookings = await api("/api/bookings", { cookie: passengerReg.cookie });
  const mine = (passengerBookings.data?.bookings ?? []).find((item) => item.id === bookingId);
  report("заявка принята у пассажира", mine?.status === "CONFIRMED", `статус: ${mine?.status}`);

  // 9. Пассажир снимает заявку
  const cancel = await api(`/api/bookings/${bookingId}/cancel`, { method: "POST", cookie: passengerReg.cookie });
  report("заявка снята", cancel.status === 200 && cancel.data?.cancelled === true);

  const afterCancel = await api(
    `/api/trips?from=${encodeURIComponent(originStop.name)}&to=${encodeURIComponent(destStop.name)}`
  );
  const tripFinal = (afterCancel.data?.trips ?? []).find((item) => item.id === trip.id);
  report("место вернулось", tripFinal?.seatsLeft === seatsBefore, `${tripFinal?.seatsLeft} мест`);
} catch (error) {
  failed += 1;
  console.error("❌ Выполнение прервано:", error instanceof Error ? error.message : error);
} finally {
  try {
    await sql.query(`DELETE FROM "User" WHERE login LIKE 'smoke-%'`);
    console.log("🧹 Тестовые данные удалены");
  } catch (error) {
    console.error("Не удалось удалить тестовые данные:", error instanceof Error ? error.message : error);
  }
  console.log(`\nИтог: ${passed} ok, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
