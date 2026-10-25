-- AlterEnum
ALTER TYPE "AuthProvider" ADD VALUE IF NOT EXISTS 'TELEGRAM';

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramUsername" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_telegramId_key" ON "User"("telegramId");
