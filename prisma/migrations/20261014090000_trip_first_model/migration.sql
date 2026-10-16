-- Поездка — самостоятельная сущность: может жить без шаблона, хранит снимок маршрута и цены
ALTER TABLE "Trip" ALTER COLUMN "routeTemplateId" DROP NOT NULL;
ALTER TABLE "Trip" ADD COLUMN "driverId" TEXT;
ALTER TABLE "Trip" ADD COLUMN "originName" TEXT;
ALTER TABLE "Trip" ADD COLUMN "destName" TEXT;
ALTER TABLE "Trip" ADD COLUMN "originLat" DOUBLE PRECISION;
ALTER TABLE "Trip" ADD COLUMN "originLng" DOUBLE PRECISION;
ALTER TABLE "Trip" ADD COLUMN "destLat" DOUBLE PRECISION;
ALTER TABLE "Trip" ADD COLUMN "destLng" DOUBLE PRECISION;
ALTER TABLE "Trip" ADD COLUMN "price" INTEGER;
ALTER TABLE "Trip" ADD COLUMN "seatsTotal" INTEGER;
ALTER TABLE "Trip" ADD COLUMN "comment" TEXT;

-- Бэкфилл из существующих шаблонов
UPDATE "Trip" t SET
  "driverId" = rt."driverId",
  "originName" = o.name,
  "destName" = d.name,
  "originLat" = o.lat,
  "originLng" = o.lng,
  "destLat" = d.lat,
  "destLng" = d.lng,
  "price" = rt.price,
  "seatsTotal" = rt.seats
FROM "RouteTemplate" rt
JOIN "CityPoint" o ON o.id = rt."originId"
JOIN "CityPoint" d ON d.id = rt."destId"
WHERE t."routeTemplateId" = rt.id;

ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE;
CREATE INDEX "Trip_driverId_date_idx" ON "Trip" ("driverId", "date");

-- Бронь: отрезок маршрута и сумма за отрезок
ALTER TABLE "Booking" ADD COLUMN "pickupStopId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "dropoffStopId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "pickupName" TEXT;
ALTER TABLE "Booking" ADD COLUMN "dropoffName" TEXT;
ALTER TABLE "Booking" ADD COLUMN "amountDue" INTEGER;
ALTER TABLE "Booking" ADD COLUMN "note" TEXT;
