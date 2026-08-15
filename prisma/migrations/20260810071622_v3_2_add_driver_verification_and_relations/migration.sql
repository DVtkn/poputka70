/*
  Warnings:

  - You are about to drop the `MaxVerification` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "MaxVerification" DROP CONSTRAINT "MaxVerification_userId_fkey";

-- Update existing NULL lat/lng values in CityPoint (Tomsk center coordinates as default)
UPDATE "CityPoint" SET "lat" = 56.4844, "lng" = 84.9481 WHERE "lat" IS NULL OR "lng" IS NULL;

-- AlterTable
ALTER TABLE "CityPoint" ALTER COLUMN "lat" SET NOT NULL,
ALTER COLUMN "lng" SET NOT NULL;

-- Update existing NULL lat/lng values in MeetingPoint (Tomsk center coordinates as default)
UPDATE "MeetingPoint" SET "lat" = 56.4844, "lng" = 84.9481 WHERE "lat" IS NULL OR "lng" IS NULL;

-- AlterTable
ALTER TABLE "MeetingPoint" ALTER COLUMN "lat" SET NOT NULL,
ALTER COLUMN "lng" SET NOT NULL;

-- AlterTable
ALTER TABLE "DriverProfile" ADD COLUMN     "carPhotoUrl" TEXT,
ADD COLUMN     "licensePhotoUrl" TEXT,
ADD COLUMN     "verificationComment" TEXT,
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "MaxVerification";

-- DropEnum
DROP TYPE "MaxVerificationStatus";
