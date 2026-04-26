// lib/whatsapp.ts

const EVOLUTION_URL = process.env.EVOLUTION_URL; 
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY; 
const INSTANCE_NAME = "TratoMarcado_Master"; 

interface SendMessageOptions {
  to: string;
  text: string;
  replyToMessageId?: string; // AGORA O TYPESCRIPT CONHECE ESSA PROPRIEDADE
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

  // 1. Extraímos os dados independente do formato que venha
  if (typeof firstArg === "string") {
    to = firstArg;
    message = secondArg || "";
  } else {
    to = firstArg.to;
    message = firstArg.text;
    replyToId = firstArg.replyToMessageId; // CAPTURAMOS O ID DA RESPOSTA
  }

  const cleanNumber = to.replace(/\D/g, "");

  if (!EVOLUTION_URL || !EVOLUTION_API_KEY) {
    console.error("❌ Configuração Evolution ausente");
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
        number: cleanNumber,
        options: { 
          delay: 1200, 
          presence: "composing",
          // 2. SE TIVER UM ID DE RESPOSTA, CONFIGURAMOS O 'QUOTED' PARA A EVOLUTION
          ...(replyToId && { 
            quoted: { 
              key: { id: replyToId } 
            } 
          })
        },
        textMessage: { text: message }
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
  try {
    const url = `${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`;
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!url || !apiKey || !to) return;

    // Limpa o número (remove espaços, traços e garante o 55)
    const cleanNumber = to.replace(/\D/g, "");
    const formattedNumber = cleanNumber.startsWith("55") ? cleanNumber : `55${cleanNumber}`;

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": apiKey },
      body: JSON.stringify({
        number: formattedNumber,
        text: text,
        delay: 1000,
      }),
    });
  } catch (error) {
    console.error("Erro Evolution API:", error);
  }
}
