// lib/whatsapp.ts

const EVOLUTION_URL = process.env.NEXT_PUBLIC_EVOLUTION_URL || process.env.EVOLUTION_API_URL; 
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY; 
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE || "teste"; 

interface SendMessageOptions {
  to: string;
  text: string;
  replyToMessageId?: string;
  phoneNumberId?: string;
  accessToken?: string;
}

export async function sendWhatsAppMessage(
  firstArg: string | SendMessageOptions,
  secondArg?: string
) {
  let to: string;
  let message: string;
  let replyToId: string | undefined;

  // 1. Extraímos os dados mantendo sua lógica original
  if (typeof firstArg === "string") {
    to = firstArg;
    message = secondArg || "";
  } else {
    to = firstArg.to;
    message = firstArg.text;
    replyToId = firstArg.replyToMessageId;
  }

  // Limpeza e formatação do número (Garante o 55 para o Brasil)
  const cleanNumber = to.replace(/\D/g, "");
  const formattedNumber = cleanNumber.startsWith("55") ? cleanNumber : `55${cleanNumber}`;

  if (!EVOLUTION_URL || !EVOLUTION_API_KEY) {
    console.error("❌ Configuração Evolution ausente no .env");
    return { success: false, data: null, messages: [] };
  }

  try {
    const res = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: formattedNumber,
        text: message, // Simplificado para v2 mas mantendo sua lógica
        options: { 
          delay: 1200, 
          presence: "composing",
          // Mantendo sua lógica de resposta (quoted)
          ...(replyToId && { 
            quoted: { 
              key: { id: replyToId } 
            } 
          })
        },
      }),
    });

    const data = await res.json();
    const messageId = data?.key?.id || data?.id || null;

    return { 
      success: res.ok, 
      data: data, 
      messages: messageId ? [{ id: messageId }] : [] 
    };

  } catch (error) {
    console.error("❌ Erro Evolution API:", error);
    return { success: false, data: null, messages: [], error };
  }
}

export const sendWhatsAppText = sendWhatsAppMessage;

export async function sendZap(to: string, text: string) {
  // Agora a sendZap utiliza a lógica robusta da função principal
  return sendWhatsAppMessage(to, text);
}
