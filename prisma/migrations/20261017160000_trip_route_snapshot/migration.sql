-- Снимок маршрута из реестра: остановки по порядку и номер маршрута
ALTER TABLE "Trip" ADD COLUMN "routeStops" JSONB;
ALTER TABLE "Trip" ADD COLUMN "routeNumber" TEXT;
