const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL || require("dotenv").config().parsed.DATABASE_URL;
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Заполнение таблицы CityPoint...");

  // Проверяем текущее состояние
  const existing = await prisma.cityPoint.count();
  console.log(`Сейчас в БД ${existing} точек`);

  if (existing > 0) {
    console.log("Точки уже есть. Очистить? (удалит все данные!)");
    console.log("Если хочешь очистить — запусти: npx prisma migrate reset --force");
    return;
  }

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
      data: point,
    });
  }

  console.log(`✅ Создано ${cityPoints.length} точек`);

  // Создаём MeetingPoint для каждой точки
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
  console.log(`✅ Создано ${points.length} MeetingPoint`);

  console.log("🎉 Готово!");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
    await prisma.$disconnect();
  });
