const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  await prisma.demandRequest.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.routeTemplate.deleteMany();
  await prisma.meetingPoint.deleteMany();
  await prisma.maxVerification.deleteMany();
  await prisma.driverProfile.deleteMany();
  await prisma.cityPoint.deleteMany();
  await prisma.user.deleteMany();

  console.log("🗑️  Tables cleared");

  const cityPoints = [
    { name: "Южные Ворота", type: "ORIGIN", category: "RESIDENTIAL" },
    { name: "Каштак", type: "ORIGIN", category: "RESIDENTIAL" },
    { name: "Зелёные Горки", type: "ORIGIN", category: "RESIDENTIAL" },
    { name: "Спартанская", type: "ORIGIN", category: "RESIDENTIAL" },
    { name: "Аэропорт", type: "ORIGIN", category: "RESIDENTIAL" },
    { name: "Площадь Ленина", type: "BOTH", category: "CENTER" },
    { name: "Новособорная", type: "BOTH", category: "CENTER" },
    { name: "Лагерный сад", type: "BOTH", category: "CENTER" },
    { name: "ТГУ", type: "DESTINATION", category: "UNIVERSITY" },
    { name: "ТПУ", type: "DESTINATION", category: "UNIVERSITY" },
    { name: "СибГМУ", type: "DESTINATION", category: "UNIVERSITY" },
    { name: "ТУСУР", type: "DESTINATION", category: "UNIVERSITY" },
    { name: "Ж/Д вокзал Томск-1", type: "BOTH", category: "TRANSPORT" },
    { name: "БЦ Мегаполис", type: "BOTH", category: "BUSINESS" },
    { name: "Изумрудный город", type: "BOTH", category: "BUSINESS" },
  ];

  for (const point of cityPoints) {
    await prisma.cityPoint.create({
      data: {
        name: point.name,
        type: point.type,
        category: point.category,
      },
    });
  }

  console.log(`✅ Created ${cityPoints.length} city points`);

  const points = await prisma.cityPoint.findMany();
  for (const point of points) {
    await prisma.meetingPoint.create({
      data: {
        cityPointId: point.id,
        name: point.name,
        landmark: `Главный вход: ${point.name}`,
        instruction: "Ждите у остановки или главного входа",
      },
    });
  }

  console.log(`✅ Created ${points.length} meeting points`);

  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  
  const admin = await prisma.user.create({
    data: {
      login: "admin",
      passwordHash: adminPasswordHash,
      firstName: "Админ",
      lastName: "Попутка70",
      role: "ADMIN",
      status: "ACTIVE",
      authProvider: "PASSWORD",
    },
  });

  console.log(`✅ Created admin user: ${admin.login}`);
  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
    await prisma.$disconnect();
  });
