import { neon } from "@neondatabase/serverless";
const BASE = "https://poputka70.vercel.app";
const sql = neon(process.env.DATABASE_URL);
const stamp = Date.now().toString(36);
const login = `smoke-view-${stamp}`;
const password = `View-${stamp}!`;

async function api(path, { method = "GET", body, cookie } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  let payload;
  if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  const cookies = res.headers.getSetCookie?.() ?? [];
  const session = cookies.map((c) => c.split(";")[0]).find((c) => c.startsWith("session="));
  return { status: res.status, data: await res.json().catch(() => null), cookie: session };
}

const reg = await api("/api/auth/register", { method: "POST", body: { login, password, firstName: "Тест", lastName: "Просмотр" } });
await api("/api/driver/register", { method: "POST", cookie: reg.cookie, body: { carModel: "Skoda Octavia", carNumber: "Т777ТТ70", carColor: "Серый" } });
const stopsA = await api(`/api/stops?query=${encodeURIComponent("Площадь Ленина")}&limit=6`);
const stopsB = await api(`/api/stops?query=${encodeURIComponent("Лагерный")}&limit=6`);
const pick = (list, needle) => (list ?? []).find((s) => s.kind === "stop" && s.name.includes(needle)) ?? (list ?? []).find((s) => s.name.includes(needle));
const origin = pick(stopsA.data?.stops, "Площадь Ленина");
const dest = pick(stopsB.data?.stops, "Лагерный");
const date = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString("en-CA", { timeZone: "Asia/Tomsk" });
const pub = await api("/api/trips", { method: "POST", cookie: reg.cookie, body: {
  origin: { name: origin.name, lat: origin.lat, lng: origin.lng },
  dest: { name: dest.name, lat: dest.lat, lng: dest.lng },
  date, time: "10:00", seats: 2, price: 120, comment: "Еду без остановок, в багажнике есть место", repeat: "none",
}});
const search = await api(`/api/trips?from=${encodeURIComponent(origin.name)}&to=${encodeURIComponent(dest.name)}`);
const trip = (search.data?.trips ?? [])[0];
console.log(JSON.stringify({ login, tripId: trip?.id, created: pub.data?.created }));
if (!trip) process.exit(1);
