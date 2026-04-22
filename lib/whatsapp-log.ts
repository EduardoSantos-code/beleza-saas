import { prisma } from "@/lib/prisma";

type LogOutboundWhatsAppMessageInput = {
  tenantId: string;
  clientId?: string | null;
  phoneNumberId: string;
  toPhoneE164: string;
  textBody: string;
  waMessageId?: string | null;
  rawJson?: unknown;
};

export async function logWhatsAppOutboundMessage(
  input: LogOutboundWhatsAppMessageInput
) {
  const data: any = {
    tenantId: input.tenantId,
    clientId: input.clientId ?? null,
    phoneNumberId: input.phoneNumberId,
    toPhoneE164: input.toPhoneE164,
    textBody: input.textBody,
    waMessageId: input.waMessageId ?? null,
  };

  if (input.rawJson !== undefined) {
    data.rawJson = input.rawJson as any;
  }

  return prisma.whatsAppOutboundMessage.create({ data });
}