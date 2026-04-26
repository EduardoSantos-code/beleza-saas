/*
  Warnings:

  - Added the required column `businessDate` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endMinutes` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startMinutes` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Professional` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "businessDate" TEXT NOT NULL,
ADD COLUMN     "endMinutes" INTEGER NOT NULL,
ADD COLUMN     "startMinutes" INTEGER NOT NULL,
ADD COLUMN     "timeZone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

-- AlterTable
ALTER TABLE "Professional" ADD COLUMN     "commissionRate" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "phoneE164" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Appointment_tenantId_businessDate_idx" ON "Appointment"("tenantId", "businessDate");
