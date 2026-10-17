#!/usr/bin/env node
/**
 * Запуск cron-задач по HTTP — для внешнего планировщика или ручной проверки.
 *
 *   CRON_SECRET=... BASE_URL=https://poputka70.vercel.app node scripts/cron-call.mjs [job]
 *
 * Без аргумента выполняет все задачи по порядку.
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const SECRET = process.env.CRON_SECRET;

if (!SECRET) {
  console.error("CRON_SECRET не задан — смотри README, раздел «Cron».");
  process.exit(1);
}

const ALL_JOBS = [
  "daily",
  "generate-trips",
  "send-reminders",
  "start-trips",
  "complete-trips",
  "expire-unpaid",
];

const requested = process.argv[2];
if (requested && !ALL_JOBS.includes(requested)) {
  console.error(`Неизвестная задача «${requested}». Доступные: ${ALL_JOBS.join(", ")}`);
  process.exit(1);
}

const jobs = requested ? [requested] : ALL_JOBS;
let failed = 0;

for (const job of jobs) {
  try {
    const response = await fetch(`${BASE_URL}/api/cron/${job}`, {
      headers: { Authorization: `Bearer ${SECRET}` },
    });
    const text = await response.text();
    console.log(`${job}: HTTP ${response.status} ${text}`);
    if (!response.ok) failed += 1;
  } catch (error) {
    console.error(`${job}: ошибка сети —`, error instanceof Error ? error.message : error);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`Завершено с ошибками: ${failed}`);
  process.exit(1);
}
console.log("Все задачи выполнены.");
