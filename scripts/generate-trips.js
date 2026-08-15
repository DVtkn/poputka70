require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log('📅 Генерация Trip на 7 дней...');
  const routes = await prisma.routeTemplate.findMany({ where: { active: true } });
  if (routes.length === 0) { console.log('❌ Нет маршрутов'); return; }

  let created = 0; const today = new Date(); today.setHours(0,0,0,0);
  for (let d = 0; d < 7; d++) {
    const date = new Date(today); date.setDate(today.getDate() + d);
    const dow = date.getDay() === 0 ? 7 : date.getDay();
    for (const r of routes) {
      if (!r.daysOfWeek.includes(dow)) continue;
      const ex = await prisma.trip.findUnique({ where: { routeTemplateId_date: { routeTemplateId: r.id, date } } });
      if (ex) continue;
      const [h, m] = r.departureTime.split(':').map(Number);
      const dep = new Date(date); dep.setHours(h, m, 0, 0);
      await prisma.trip.create({ data: { routeTemplateId: r.id, date, departureTime: dep, status: 'SCHEDULED', availableSeats: r.seats } });
      created++;
    }
  }
  console.log(`✅ Создано ${created} Trip\n🎉 Готово!`);
}

main().catch(e => { console.error('❌', e); process.exit(1); }).finally(async () => { await pool.end(); await prisma.$disconnect(); });
