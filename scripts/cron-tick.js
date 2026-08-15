require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log('⏰ Cron tick\n');
  const now = new Date();

  const tm = new Date(now); tm.setDate(tm.getDate()+1); tm.setHours(0,0,0,0);
  const dow = tm.getDay()===0?7:tm.getDay();
  const rs = await prisma.routeTemplate.findMany({ where: { active: true, daysOfWeek: { has: dow } } });
  let g = 0;
  for (const r of rs) {
    const ex = await prisma.trip.findUnique({ where: { routeTemplateId_date: { routeTemplateId: r.id, date: tm } } });
    if (!ex) { const [h,m]=r.departureTime.split(':').map(Number); const d=new Date(tm); d.setHours(h,m,0,0);
      await prisma.trip.create({ data: { routeTemplateId: r.id, date: tm, departureTime: d, status: 'SCHEDULED', availableSeats: r.seats } }); g++; }
  }
  console.log(`📅 +${g} Trip на завтра`);

  const missed = await prisma.trip.findMany({ where: { status: 'PENDING_CONFIRMATION', confirmationDeadline: { lt: now }, driverConfirmed: false } });
  for (const t of missed) await prisma.trip.update({ where: { id: t.id }, data: { status: 'UNCONFIRMED' } });
  console.log(`❌ ${missed.length} → UNCONFIRMED`);

  const in2h = new Date(now.getTime() + 2*60*60*1000);
  const soon = await prisma.trip.findMany({ where: { status: 'SCHEDULED', departureTime: { lte: in2h, gt: now } } });
  for (const t of soon) { const dl = new Date(t.departureTime.getTime()-60*60*1000);
    await prisma.trip.update({ where: { id: t.id }, data: { status: 'PENDING_CONFIRMATION', confirmationDeadline: dl } }); }
  console.log(`⏳ ${soon.length} → PENDING_CONFIRMATION`);

  const dep = await prisma.trip.findMany({ where: { status: 'CONFIRMED', departureTime: { lte: now } } });
  for (const t of dep) await prisma.trip.update({ where: { id: t.id }, data: { status: 'IN_PROGRESS' } });
  console.log(`🚗 ${dep.length} → IN_PROGRESS`);

  const t2 = new Date(now.getTime() - 2*60*60*1000);
  const done = await prisma.trip.findMany({ where: { status: 'IN_PROGRESS', departureTime: { lte: t2 } } });
  for (const t of done) await prisma.trip.update({ where: { id: t.id }, data: { status: 'COMPLETED' } });
  console.log(`✅ ${done.length} → COMPLETED\n🎉 Cron tick завершён`);
}

main().catch(e => { console.error('❌', e); process.exit(1); }).finally(async () => { await pool.end(); await prisma.$disconnect(); });
