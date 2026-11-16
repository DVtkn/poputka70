-- DropIndex
DROP INDEX IF EXISTS "Review_bookingId_key";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Review_bookingId_reviewerId_key" ON "Review"("bookingId", "reviewerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Review_bookingId_idx" ON "Review"("bookingId");
