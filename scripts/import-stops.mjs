#!/usr/bin/env node
/**
 * Импорт остановок Томска из data/tomsk-stops.csv в таблицу Stop (через Neon HTTP).
 * Идемпотентен: повторный запуск не создаёт дубликатов.
 *
 *   node scripts/import-stops.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL не задан");
  process.exit(1);
}

const sql = neon(connectionString);

/** Ключевые остановки для быстрого выбора на главной (подпись — как в CSV). */
const POPULAR = new Set(
  [
    "ТГУ",
    "ТПУ",
    "СибГМУ",
    "ТУСУР",
    "Площадь Ленина",
    "Новособорная площадь",
    "Лагерный сад",
    "Ж/Д вокзал Томск-1",
    "Аэропорт",
    "БЦ Мегаполис",
    "Изумрудный город",
    "Автовокзал",
    "Каштак",
    "Южные Ворота",
    "Зелёные Горки",
    "Спартанская",
  ].map((name) => name.toLowerCase().replace(/ё/g, "е"))
);

function normalize(value) {
  return value.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

function parseNumber(raw) {
  if (!raw) return NaN;
  return Number.parseFloat(raw.trim().replace(",", "."));
}

function parseCsv() {
  const file = path.join(process.cwd(), "data", "tomsk-stops.csv");
  const content = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

  const rows = [];
  const seen = new Set();

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(";");
    const name = (cells[1] || "").trim();
    const lat = parseNumber(cells[5]);
    const lng = parseNumber(cells[6]);
    const address = (cells[7] || "").trim() || null;
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const dedupeKey = `${normalize(name)}|${lat.toFixed(5)}|${lng.toFixed(5)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    rows.push({
      name,
      nameNormalized: normalize(name),
      address,
      lat,
      lng,
      busRoutes: (cells[2] || "").trim() || null,
      trolleyRoutes: (cells[3] || "").trim() || null,
      tramRoutes: (cells[4] || "").trim() || null,
      isPopular: POPULAR.has(normalize(name)),
    });
  }

  return rows;
}

const rows = parseCsv();
console.log(`Строк в CSV: ${rows.length} (после дедупликации)`);

const existing = new Set(
  (await sql.query(`SELECT "nameNormalized", "lat", "lng" FROM "Stop"`)).map(
    (row) => `${row.nameNormalized}|${Number(row.lat).toFixed(5)}|${Number(row.lng).toFixed(5)}`
  )
);

const toInsert = rows.filter(
  (row) => !existing.has(`${row.nameNormalized}|${row.lat.toFixed(5)}|${row.lng.toFixed(5)}`)
);

console.log(`Уже в базе: ${existing.size}; к добавлению: ${toInsert.length}`);
if (toInsert.length === 0) {
  console.log("Нечего добавлять.");
  process.exit(0);
}

const CHUNK = 80;
let inserted = 0;
for (let offset = 0; offset < toInsert.length; offset += CHUNK) {
  const chunk = toInsert.slice(offset, offset + CHUNK);
  const placeholders = [];
  const params = [];
  for (const row of chunk) {
    const base = params.length;
    placeholders.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10})`
    );
    params.push(
      crypto.randomUUID(),
      row.name,
      row.nameNormalized,
      row.address,
      row.lat,
      row.lng,
      row.busRoutes,
      row.trolleyRoutes,
      row.tramRoutes,
      row.isPopular
    );
  }

  await sql.query(
    `INSERT INTO "Stop" ("id","name","nameNormalized","address","lat","lng","busRoutes","trolleyRoutes","tramRoutes","isPopular")
     VALUES ${placeholders.join(",")}`,
    params
  );
  inserted += chunk.length;
  console.log(`  вставлено ${inserted}/${toInsert.length}`);
}

const total = await sql.query(`SELECT COUNT(*)::int AS count, COUNT(*) FILTER (WHERE "isPopular")::int AS popular FROM "Stop"`);
console.log(`Итого в Stop: ${total[0].count} (популярных: ${total[0].popular})`);
