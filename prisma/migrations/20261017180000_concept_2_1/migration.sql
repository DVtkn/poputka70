-- Concept 2.1: Живая лента поездок + Биржа спроса
-- 1. Добавляем флаг хаба к остановкам
ALTER TABLE "Stop" ADD COLUMN "isHub" BOOLEAN NOT NULL DEFAULT false;

-- 2. Добавляем новые колонки к Trip (Concept 2.1)
ALTER TABLE "Trip" ADD COLUMN "originStopId" TEXT;
ALTER TABLE "Trip" ADD COLUMN "destStopId" TEXT;
ALTER TABLE "Trip" ADD COLUMN "autoAccept" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Trip" ADD COLUMN "repeatType" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "Trip" ADD COLUMN "repeatUntil" TIMESTAMP(3);
ALTER TABLE "Trip" ADD COLUMN "parentTripId" TEXT;

-- Внешние ключи на Stop
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_originStopId_fkey" FOREIGN KEY ("originStopId") REFERENCES "Stop"("id") ON DELETE SET NULL;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_destStopId_fkey" FOREIGN KEY ("destStopId") REFERENCES "Stop"("id") ON DELETE SET NULL;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_parentTripId_fkey" FOREIGN KEY ("parentTripId") REFERENCES "Trip"("id") ON DELETE SET NULL;

-- Индекс на пару остановок для быстрого матчинга
CREATE INDEX "Trip_originStopId_destStopId_idx" ON "Trip"("originStopId", "destStopId");

-- 3. Добавляем DECLINED к enum BookingStatus
ALTER TYPE "BookingStatus" ADD VALUE 'DECLINED';

-- 4. Добавляем новые колонки к Booking
ALTER TABLE "Booking" ADD COLUMN "autoAccepted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Booking" ADD COLUMN "phonesVisibleAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "segmentPrice" INTEGER;

-- 5. Обновляем DemandRequest: меняем ссылки с CityPoint на Stop
-- Добавляем новые колонки
ALTER TABLE "DemandRequest" ADD COLUMN "passengerId" TEXT;
ALTER TABLE "DemandRequest" ADD COLUMN "fromStopId" TEXT;
ALTER TABLE "DemandRequest" ADD COLUMN "toStopId" TEXT;
ALTER TABLE "DemandRequest" ADD COLUMN "date" TIMESTAMP(3);
ALTER TABLE "DemandRequest" ADD COLUMN "timeWindow" TEXT;
ALTER TABLE "DemandRequest" ADD COLUMN "seats" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "DemandRequest" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'OPEN';
ALTER TABLE "DemandRequest" ADD COLUMN "matchedTripId" TEXT;
ALTER TABLE "DemandRequest" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Внешние ключи
ALTER TABLE "DemandRequest" ADD CONSTRAINT "DemandRequest_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "DemandRequest" ADD CONSTRAINT "DemandRequest_fromStopId_fkey" FOREIGN KEY ("fromStopId") REFERENCES "Stop"("id") ON DELETE CASCADE;
ALTER TABLE "DemandRequest" ADD CONSTRAINT "DemandRequest_toStopId_fkey" FOREIGN KEY ("toStopId") REFERENCES "Stop"("id") ON DELETE CASCADE;
ALTER TABLE "DemandRequest" ADD CONSTRAINT "DemandRequest_matchedTripId_fkey" FOREIGN KEY ("matchedTripId") REFERENCES "Trip"("id") ON DELETE SET NULL;

-- Индексы
CREATE INDEX "DemandRequest_fromStopId_toStopId_date_idx" ON "DemandRequest"("fromStopId", "toStopId", "date");
CREATE INDEX "DemandRequest_status_idx" ON "DemandRequest"("status");

-- Удаляем старые колонки и ограничения DemandRequest
ALTER TABLE "DemandRequest" DROP CONSTRAINT IF EXISTS "DemandRequest_userId_fkey";
ALTER TABLE "DemandRequest" DROP COLUMN "userId";
ALTER TABLE "DemandRequest" DROP COLUMN "originId";
ALTER TABLE "DemandRequest" DROP COLUMN "destId";
ALTER TABLE "DemandRequest" DROP COLUMN "desiredTime";
ALTER TABLE "DemandRequest" DROP COLUMN "daysOfWeek";
ALTER TABLE "DemandRequest" DROP COLUMN "fulfilled";
ALTER TABLE "DemandRequest" DROP COLUMN "createdAt";

-- Переименовываем createdAt обратно (если нужно) — уже есть через DEFAULT now()
-- Но мы удалили createdAt выше, добавляем обратно
ALTER TABLE "DemandRequest" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 6. Убираем старые колонки Trip, которые больше не нужны (Concept 2.1)
-- confirmationDeadline, driverConfirmed, confirmedAt — больше не используются
-- Оставляем их в БД для обратной совместимости, но приложение не пишет в них
-- (Удаление enum значений в PostgreSQL не поддерживается напрямую)

-- 7. Комментарий
COMMENT ON COLUMN "Trip"."autoAccept" IS 'Мгновенное подтверждение брони (true по умолчанию)';
COMMENT ON COLUMN "Trip"."repeatType" IS 'NONE / WEEKDAYS / DAILY';
COMMENT ON COLUMN "Booking"."segmentPrice" IS 'Цена отрезка для этого бронирования';
COMMENT ON COLUMN "Booking"."autoAccepted" IS 'Признак мгновенного подтверждения при создании';
