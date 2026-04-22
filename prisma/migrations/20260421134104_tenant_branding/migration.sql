-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "address" TEXT,
ADD COLUMN     "heroImageUrl" TEXT,
ADD COLUMN     "instagram" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "primaryColor" TEXT DEFAULT '#7c3aed',
ADD COLUMN     "publicDescription" TEXT,
ADD COLUMN     "publicPhone" TEXT;
