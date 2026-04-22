-- CreateEnum
CREATE TYPE "WhatsAppInboundMessageType" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'STICKER', 'LOCATION', 'CONTACTS', 'INTERACTIVE', 'BUTTON', 'ORDER', 'REACTION', 'UNKNOWN');

-- CreateTable
CREATE TABLE "WhatsAppInboundMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT,
    "waMessageId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "fromPhoneE164" TEXT NOT NULL,
    "fromName" TEXT,
    "type" "WhatsAppInboundMessageType" NOT NULL DEFAULT 'UNKNOWN',
    "textBody" TEXT,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppInboundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppOutboundMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT,
    "waMessageId" TEXT,
    "phoneNumberId" TEXT NOT NULL,
    "toPhoneE164" TEXT NOT NULL,
    "textBody" TEXT NOT NULL,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppOutboundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppInboundMessage_waMessageId_key" ON "WhatsAppInboundMessage"("waMessageId");

-- CreateIndex
CREATE INDEX "WhatsAppInboundMessage_tenantId_createdAt_idx" ON "WhatsAppInboundMessage"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppInboundMessage_clientId_createdAt_idx" ON "WhatsAppInboundMessage"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppInboundMessage_fromPhoneE164_createdAt_idx" ON "WhatsAppInboundMessage"("fromPhoneE164", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppOutboundMessage_waMessageId_key" ON "WhatsAppOutboundMessage"("waMessageId");

-- CreateIndex
CREATE INDEX "WhatsAppOutboundMessage_tenantId_createdAt_idx" ON "WhatsAppOutboundMessage"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppOutboundMessage_clientId_createdAt_idx" ON "WhatsAppOutboundMessage"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppOutboundMessage_toPhoneE164_createdAt_idx" ON "WhatsAppOutboundMessage"("toPhoneE164", "createdAt");

-- AddForeignKey
ALTER TABLE "WhatsAppInboundMessage" ADD CONSTRAINT "WhatsAppInboundMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppInboundMessage" ADD CONSTRAINT "WhatsAppInboundMessage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppOutboundMessage" ADD CONSTRAINT "WhatsAppOutboundMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppOutboundMessage" ADD CONSTRAINT "WhatsAppOutboundMessage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
