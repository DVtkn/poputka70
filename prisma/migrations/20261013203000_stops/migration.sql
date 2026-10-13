-- Справочник остановок Томска (импорт из data/tomsk-stops.csv, scripts/import-stops.mjs)
CREATE TABLE "Stop" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nameNormalized" TEXT NOT NULL,
  "address" TEXT,
  "lat" DOUBLE PRECISION NOT NULL,
  "lng" DOUBLE PRECISION NOT NULL,
  "busRoutes" TEXT,
  "trolleyRoutes" TEXT,
  "tramRoutes" TEXT,
  "isPopular" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Stop_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Stop_nameNormalized_idx" ON "Stop"("nameNormalized");
CREATE INDEX "Stop_isPopular_idx" ON "Stop"("isPopular");
