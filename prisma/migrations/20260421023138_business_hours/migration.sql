-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- CreateTable
CREATE TABLE "TenantBusinessHour" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "weekday" "Weekday" NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "startMin" INTEGER,
    "endMin" INTEGER,
    "breakStartMin" INTEGER,
    "breakEndMin" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantBusinessHour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalBusinessHour" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "weekday" "Weekday" NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "startMin" INTEGER,
    "endMin" INTEGER,
    "breakStartMin" INTEGER,
    "breakEndMin" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalBusinessHour_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantBusinessHour_tenantId_weekday_idx" ON "TenantBusinessHour"("tenantId", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "TenantBusinessHour_tenantId_weekday_key" ON "TenantBusinessHour"("tenantId", "weekday");

-- CreateIndex
CREATE INDEX "ProfessionalBusinessHour_professionalId_weekday_idx" ON "ProfessionalBusinessHour"("professionalId", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalBusinessHour_professionalId_weekday_key" ON "ProfessionalBusinessHour"("professionalId", "weekday");

-- AddForeignKey
ALTER TABLE "TenantBusinessHour" ADD CONSTRAINT "TenantBusinessHour_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalBusinessHour" ADD CONSTRAINT "ProfessionalBusinessHour_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE CASCADE ON UPDATE CASCADE;
