#!/usr/bin/env node
/**
 * Ежедневный мониторинг здоровья прода (Этап 2).
 * Проверяет /api/health и ключевые страницы, выводит отчёт.
 *
 * Запуск: node --env-file=.env scripts/health-check.mjs
 * Можно добавить в cron (например, каждое утро недели запуска).
 */
import { neon } from "@neondatabase/serverless";

const BASE = process.env.BASE_URL || "https://poputka70.vercel.app";
const DATABASE_URL = process.env.DATABASE_URL;

let passed = 0;
let failed = 0;

function report(name, ok, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (ok) passed += 1;
  else failed += 1;
}

async function fetchWithTimeout(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

async function main() {
  console.log(`🔍 Мониторинг здоровья Poputka70: ${BASE}\n`);

  // 1. Health endpoint
  try {
    const res = await fetchWithTimeout(`${BASE}/api/health`);
    const data = await res.json();
    report("health", res.ok, `status=${res.status}, db=${data.database ?? "?"}`);
  } catch (error) {
    report("health", false, error.message);
  }

  // 2. Главная страница
  try {
    const res = await fetchWithTimeout(`${BASE}/`);
    report("главная страница", res.ok, `status=${res.status}`);
  } catch (error) {
    report("главная страница", false, error.message);
  }

  // 3. Поиск
  try {
    const res = await fetchWithTimeout(`${BASE}/search`);
    report("страница поиска", res.ok, `status=${res.status}`);
  } catch (error) {
    report("страница поиска", false, error.message);
  }

  // 4. Лента поездок (API)
  try {
    const res = await fetchWithTimeout(`${BASE}/api/trips`);
    const data = await res.json();
    report("API лента поездок", res.ok, `count=${data.count ?? 0}`);
  } catch (error) {
    report("API лента поездок", false, error.message);
  }

  // 5. Справочник остановок
  try {
    const res = await fetchWithTimeout(`${BASE}/api/stops?query=СибГМУ`);
    const data = await res.json();
    report("API остановки", res.ok, `found=${data.count ?? 0}`);
  } catch (error) {
    report("API остановки", false, error.message);
  }

  // 6. Проверка БД (если DATABASE_URL задан)
  if (DATABASE_URL) {
    try {
      const sql = neon(DATABASE_URL);
      const users = await sql`SELECT count(*) as cnt FROM "User"`;
      const trips = await sql`SELECT count(*) as cnt FROM "Trip"`;
      const bookings = await sql`SELECT count(*) as cnt FROM "Booking"`;
      report("БД: пользователи", true, `${users[0].cnt}`);
      report("БД: поездки", true, `${trips[0].cnt}`);
      report("БД: бронирования", true, `${bookings[0].cnt}`);
    } catch (error) {
      report("БД: подключение", false, error.message);
    }
  }

  console.log(`\n📊 Итог: ${passed} прошло, ${failed} упало`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("Мониторинг упал:", error);
  process.exit(1);
});
