/*
  Warnings:

  - The values [CANCELLED_BY_PASSENGER,CANCELLED_BY_DRIVER,NO_SHOW] on the enum `BookingStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `cancelReason` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `rideId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `adminNote` on the `Complaint` table. All the data in the column will be lost.
  - You are about to drop the column `bookingId` on the `Complaint` table. All the data in the column will be lost.
  - You are about to drop the column `reporterId` on the `Complaint` table. All the data in the column will be lost.
  - You are about to drop the column `resolvedAt` on the `Complaint` table. All the data in the column will be lost.
  - You are about to drop the column `targetId` on the `Complaint` table. All the data in the column will be lost.
  - The `status` column on the `Complaint` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `noShowCount` on the `DriverProfile` table. All the data in the column will be lost.
  - You are about to drop the column `totalRides` on the `DriverProfile` table. All the data in the column will be lost.
  - You are about to drop the column `body` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `payload` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `sentAt` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `bookingId` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `revieweeId` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `reviewerId` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `RouteTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `blockedUntil` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `consentGivenAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `consentVersion` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isAdmin` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isBlocked` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `noShowCount` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `ratingCount` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `telegramId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Ride` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RideRequest` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[routeTemplateId,passengerId]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[login]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `routeTemplateId` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `authorId` to the `Complaint` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `reason` on the `Complaint` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `message` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `Notification` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `authorId` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `driverId` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `login` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BookingStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
ALTER TABLE "public"."Booking" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Booking" ALTER COLUMN "status" TYPE "BookingStatus_new" USING ("status"::text::"BookingStatus_new");
ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";
ALTER TYPE "BookingStatus_new" RENAME TO "BookingStatus";
DROP TYPE "public"."BookingStatus_old";
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ADMIN';

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_passengerId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_rideId_fkey";

-- DropForeignKey
ALTER TABLE "Complaint" DROP CONSTRAINT "Complaint_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "Complaint" DROP CONSTRAINT "Complaint_reporterId_fkey";

-- DropForeignKey
ALTER TABLE "Complaint" DROP CONSTRAINT "Complaint_targetId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_revieweeId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_reviewerId_fkey";

-- DropForeignKey
ALTER TABLE "Ride" DROP CONSTRAINT "Ride_destId_fkey";

-- DropForeignKey
ALTER TABLE "Ride" DROP CONSTRAINT "Ride_driverId_fkey";

-- DropForeignKey
ALTER TABLE "Ride" DROP CONSTRAINT "Ride_originId_fkey";

-- DropForeignKey
ALTER TABLE "Ride" DROP CONSTRAINT "Ride_templateId_fkey";

-- DropForeignKey
ALTER TABLE "RideRequest" DROP CONSTRAINT "RideRequest_destId_fkey";

-- DropForeignKey
ALTER TABLE "RideRequest" DROP CONSTRAINT "RideRequest_matchedRideId_fkey";

-- DropForeignKey
ALTER TABLE "RideRequest" DROP CONSTRAINT "RideRequest_originId_fkey";

-- DropForeignKey
ALTER TABLE "RideRequest" DROP CONSTRAINT "RideRequest_passengerId_fkey";

-- DropIndex
DROP INDEX "Booking_passengerId_idx";

-- DropIndex
DROP INDEX "Booking_passengerId_status_idx";

-- DropIndex
DROP INDEX "Booking_rideId_idx";

-- DropIndex
DROP INDEX "Booking_rideId_passengerId_key";

-- DropIndex
DROP INDEX "Booking_status_idx";

-- DropIndex
DROP INDEX "CityPoint_category_idx";

-- DropIndex
DROP INDEX "CityPoint_type_idx";

-- DropIndex
DROP INDEX "Complaint_bookingId_key";

-- DropIndex
DROP INDEX "Complaint_reporterId_idx";

-- DropIndex
DROP INDEX "Complaint_status_idx";

-- DropIndex
DROP INDEX "Complaint_targetId_idx";

-- DropIndex
DROP INDEX "Notification_sentAt_idx";

-- DropIndex
DROP INDEX "Notification_userId_read_idx";

-- DropIndex
DROP INDEX "Review_bookingId_key";

-- DropIndex
DROP INDEX "Review_bookingId_reviewerId_key";

-- DropIndex
DROP INDEX "Review_revieweeId_idx";

-- DropIndex
DROP INDEX "Review_reviewerId_idx";

-- DropIndex
DROP INDEX "RouteTemplate_active_idx";

-- DropIndex
DROP INDEX "RouteTemplate_driverId_idx";

-- DropIndex
DROP INDEX "RouteTemplate_driverId_originId_destId_departureTime_key";

-- DropIndex
DROP INDEX "User_isBlocked_blockedUntil_idx";

-- DropIndex
DROP INDEX "User_role_idx";

-- DropIndex
DROP INDEX "User_telegramId_key";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "cancelReason",
DROP COLUMN "rideId",
ADD COLUMN     "routeTemplateId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CityPoint" ALTER COLUMN "type" DROP DEFAULT,
ALTER COLUMN "category" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Complaint" DROP COLUMN "adminNote",
DROP COLUMN "bookingId",
DROP COLUMN "reporterId",
DROP COLUMN "resolvedAt",
DROP COLUMN "targetId",
ADD COLUMN     "authorId" TEXT NOT NULL,
DROP COLUMN "reason",
ADD COLUMN     "reason" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "DriverProfile" DROP COLUMN "noShowCount",
DROP COLUMN "totalRides",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "body",
DROP COLUMN "payload",
DROP COLUMN "sentAt",
DROP COLUMN "title",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "message" TEXT NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "bookingId",
DROP COLUMN "revieweeId",
DROP COLUMN "reviewerId",
ADD COLUMN     "authorId" TEXT NOT NULL,
ADD COLUMN     "driverId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RouteTemplate" DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "blockedUntil",
DROP COLUMN "consentGivenAt",
DROP COLUMN "consentVersion",
DROP COLUMN "isAdmin",
DROP COLUMN "isBlocked",
DROP COLUMN "noShowCount",
DROP COLUMN "rating",
DROP COLUMN "ratingCount",
DROP COLUMN "telegramId",
DROP COLUMN "updatedAt",
DROP COLUMN "username",
ADD COLUMN     "login" TEXT NOT NULL,
ADD COLUMN     "passwordHash" TEXT NOT NULL;

-- DropTable
DROP TABLE "Ride";

-- DropTable
DROP TABLE "RideRequest";

-- DropEnum
DROP TYPE "ComplaintReason";

-- DropEnum
DROP TYPE "ComplaintStatus";

-- DropEnum
DROP TYPE "NotificationType";

-- DropEnum
DROP TYPE "RequestStatus";

-- DropEnum
DROP TYPE "RideStatus";

-- CreateIndex
CREATE UNIQUE INDEX "Booking_routeTemplateId_passengerId_key" ON "Booking"("routeTemplateId", "passengerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_routeTemplateId_fkey" FOREIGN KEY ("routeTemplateId") REFERENCES "RouteTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
