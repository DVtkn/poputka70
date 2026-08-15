/*
  Warnings:

  - You are about to drop the column `routeTemplateId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `authorId` on the `Complaint` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `Complaint` table. All the data in the column will be lost.
  - The `status` column on the `Complaint` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `rating` on the `DriverProfile` table. All the data in the column will be lost.
  - You are about to drop the column `verified` on the `DriverProfile` table. All the data in the column will be lost.
  - You are about to drop the column `message` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `authorId` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `driverId` on the `Review` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tripId,passengerId]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[bookingId]` on the table `Review` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[referralCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `compensationAmount` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serviceFeeAmount` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tripId` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `Complaint` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reporterId` to the `Complaint` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `Complaint` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `body` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookingId` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `revieweeId` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reviewerId` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('PASSWORD', 'PHONE');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('SCHEDULED', 'PENDING_CONFIRMATION', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_PASSENGER', 'UNCONFIRMED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "FeeStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "MaxVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'NO_SHOW';

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_routeTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "Complaint" DROP CONSTRAINT "Complaint_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_authorId_fkey";

-- DropIndex
DROP INDEX "Booking_routeTemplateId_passengerId_key";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "routeTemplateId",
ADD COLUMN     "compensationAmount" INTEGER NOT NULL,
ADD COLUMN     "distanceKm" DOUBLE PRECISION,
ADD COLUMN     "offerAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentReference" TEXT,
ADD COLUMN     "pricingVersion" TEXT,
ADD COLUMN     "serviceFeeAmount" INTEGER NOT NULL,
ADD COLUMN     "serviceFeeStatus" "FeeStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "totalAmount" INTEGER NOT NULL,
ADD COLUMN     "tripId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Complaint" DROP COLUMN "authorId",
DROP COLUMN "reason",
ADD COLUMN     "bookingId" TEXT,
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "reporterId" TEXT NOT NULL,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ALTER COLUMN "description" SET NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "DriverProfile" DROP COLUMN "rating",
DROP COLUMN "verified",
ADD COLUMN     "totalRides" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "message",
ADD COLUMN     "body" TEXT NOT NULL,
ADD COLUMN     "relatedEntityId" TEXT,
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "authorId",
DROP COLUMN "driverId",
ADD COLUMN     "bookingId" TEXT NOT NULL,
ADD COLUMN     "revieweeId" TEXT NOT NULL,
ADD COLUMN     "reviewerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RouteTemplate" ADD COLUMN     "destMeetingPointId" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "originMeetingPointId" TEXT,
ADD COLUMN     "serviceFee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Tomsk';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "authProvider" "AuthProvider" NOT NULL DEFAULT 'PASSWORD',
ADD COLUMN     "maxUsername" TEXT,
ADD COLUMN     "maxVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "maxVerifiedBy" TEXT,
ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "ratingAsDriver" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
ADD COLUMN     "ratingAsPassenger" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referredBy" TEXT,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "lastActiveAt" DROP DEFAULT,
ALTER COLUMN "login" DROP NOT NULL,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "MaxVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "maxUsername" TEXT NOT NULL,
    "status" "MaxVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaxVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingPoint" (
    "id" TEXT NOT NULL,
    "cityPointId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "landmark" TEXT,
    "instruction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "routeTemplateId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "departureTime" TIMESTAMP(3) NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'SCHEDULED',
    "driverConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "confirmationDeadline" TIMESTAMP(3),
    "availableSeats" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originId" TEXT NOT NULL,
    "destId" TEXT NOT NULL,
    "desiredTime" TEXT,
    "daysOfWeek" INTEGER[],
    "fulfilled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaxVerification_status_idx" ON "MaxVerification"("status");

-- CreateIndex
CREATE INDEX "Trip_date_status_idx" ON "Trip"("date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_routeTemplateId_date_key" ON "Trip"("routeTemplateId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "DemandRequest_originId_destId_desiredTime_idx" ON "DemandRequest"("originId", "destId", "desiredTime");

-- CreateIndex
CREATE INDEX "Booking_passengerId_status_idx" ON "Booking"("passengerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_tripId_passengerId_key" ON "Booking"("tripId", "passengerId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AddForeignKey
ALTER TABLE "MaxVerification" ADD CONSTRAINT "MaxVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingPoint" ADD CONSTRAINT "MeetingPoint_cityPointId_fkey" FOREIGN KEY ("cityPointId") REFERENCES "CityPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_routeTemplateId_fkey" FOREIGN KEY ("routeTemplateId") REFERENCES "RouteTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandRequest" ADD CONSTRAINT "DemandRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
