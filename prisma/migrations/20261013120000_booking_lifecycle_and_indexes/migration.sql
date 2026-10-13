-- Жизненный цикл брони: дедлайн оплаты и фиксация отмены
ALTER TABLE "Booking" ADD COLUMN "paymentDeadline" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "cancelInitiator" TEXT;

-- Одна активная бронь на (поездка, пассажир); отменённые не мешают новой
DROP INDEX "Booking_tripId_passengerId_key";
CREATE UNIQUE INDEX "Booking_active_trip_passenger_key"
  ON "Booking" ("tripId", "passengerId")
  WHERE status IN ('PENDING', 'CONFIRMED');

-- Индексы под реальные фильтры запросов
CREATE INDEX "Booking_tripId_status_idx" ON "Booking" ("tripId", "status");
CREATE INDEX "Booking_paymentDeadline_idx" ON "Booking" ("paymentDeadline");
CREATE INDEX "Trip_status_departureTime_idx" ON "Trip" ("status", "departureTime");
CREATE INDEX "Trip_confirmationDeadline_idx" ON "Trip" ("confirmationDeadline");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification" ("userId", "createdAt");
CREATE INDEX "Review_revieweeId_idx" ON "Review" ("revieweeId");
CREATE INDEX "DriverProfile_verificationStatus_idx" ON "DriverProfile" ("verificationStatus");
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription" ("userId");
CREATE INDEX "User_referredBy_idx" ON "User" ("referredBy");
CREATE INDEX "RouteTemplate_driverId_idx" ON "RouteTemplate" ("driverId");
CREATE INDEX "RouteTemplate_active_isRecurring_idx" ON "RouteTemplate" ("active", "isRecurring");

-- Места не могут уйти в минус
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_availableSeats_nonneg" CHECK ("availableSeats" >= 0);
