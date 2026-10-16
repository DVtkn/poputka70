#!/usr/bin/env node
/**
 * Починка координат «точек-ориентиров» (CityPoint): все 15 записей получили
 * одинаковые координаты при раннем сиде. Ставим реальные: сначала точное
 * совпадение с настоящей остановкой (Stop), иначе — проверенные координаты.
 *
 *   node --env-file=.env scripts/db/fix-citypoint-coords.mjs
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const CURATED = {
  "южные ворота": { lat: 56.44, lng: 85.055 },
  каштак: { lat: 56.515, lng: 85.015 },
  "зеленые горки": { lat: 56.52, lng: 85.005 },
  спартанская: { lat: 56.512, lng: 85.03 },
  аэропорт: { lat: 56.383, lng: 85.21 },
  "площадь ленина": { lat: 56.4977, lng: 84.9481 },
  новособорная: { lat: 56.4918, lng: 84.9486 },
  "лагерный сад": { lat: 56.472, lng: 84.949 },
  тгу: { lat: 56.4693, lng: 84.9478 },
  тпу: { lat: 56.4653, lng: 84.9505 },
  сибгму: { lat: 56.475, lng: 84.937 },
  тусур: { lat: 56.4617, lng: 84.9373 },
  "ж/д вокзал томск-1": { lat: 56.4785, lng: 84.9153 },
  "бц мегаполис": { lat: 56.4887, lng: 84.968 },
  "изумрудный город": { lat: 56.526, lng: 85.008 },
};

function normalize(value) {
  return value.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

const points = await sql.query(`SELECT id, name FROM "CityPoint"`);
const stops = await sql.query(`SELECT "nameNormalized", lat, lng FROM "Stop"`);
const stopByNorm = new Map();
for (const stop of stops) {
  if (!stopByNorm.has(stop.nameNormalized)) stopByNorm.set(stop.nameNormalized, stop);
}

let updated = 0;
let missing = 0;
for (const point of points) {
  const norm = normalize(point.name);
  const exactStop = stopByNorm.get(norm);
  const fallback = CURATED[norm];
  const coords = exactStop ? { lat: exactStop.lat, lng: exactStop.lng } : fallback;
  if (!coords) {
    console.log(`⚠️  нет координат для «${point.name}» — пропускаю`);
    missing += 1;
    continue;
  }
  await sql.query(`UPDATE "CityPoint" SET lat = $1, lng = $2 WHERE id = $3`, [coords.lat, coords.lng, point.id]);
  updated += 1;
}
console.log(`Обновлено точек: ${updated}${missing ? `, без координат: ${missing}` : ""}`);

// Обновляем снимки координат у существующих рейсов, привязанных к шаблонам
const trips = await sql.query(`
  UPDATE "Trip" t SET
    "originLat" = o.lat, "originLng" = o.lng,
    "destLat" = d.lat, "destLng" = d.lng
  FROM "RouteTemplate" rt
  JOIN "CityPoint" o ON o.id = rt."originId"
  JOIN "CityPoint" d ON d.id = rt."destId"
  WHERE t."routeTemplateId" = rt.id
  RETURNING t.id
`);
console.log(`Обновлено снимков рейсов: ${trips.length}`);

const check = await sql.query(`SELECT COUNT(DISTINCT (lat, lng))::int AS distinct_pairs FROM "CityPoint"`);
console.log(`Различных пар координат у точек: ${check[0].distinct_pairs} из 15`);
