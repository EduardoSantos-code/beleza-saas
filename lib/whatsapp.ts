// lib/whatsapp.ts

const EVOLUTION_URL = process.env.EVOLUTION_URL; 
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY; 
const INSTANCE_NAME = "TratoMarcado_Master"; 

interface SendMessageOptions {
  to: string;
  text: string;
  phoneNumberId?: string;
  accessToken?: string;
}

export async function sendWhatsAppMessage(
  firstArg: string | SendMessageOptions,
  secondArg?: string
) {
  let to: string;
  let message: string;

  if (typeof firstArg === "string") {
    to = firstArg;
    message = secondArg || "";
  } else {
    to = firstArg.to;
    message = firstArg.text;
  }

  const cleanNumber = to.replace(/\D/g, "");

  if (!EVOLUTION_URL || !EVOLUTION_API_KEY) {
    console.error("❌ Configuração ausente");
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
        options: { delay: 1200, presence: "composing" },
        textMessage: { text: message }
      }),
    });

    const data = await res.json();

    // --- A SOLUÇÃO PARA O ERRO DE BUILD ---
    // A Evolution API retorna o ID em data.key.id ou data.id
    // Nós mapeamos isso para o formato que o seu reply/route.ts espera
    const messageId = data?.key?.id || data?.id || null;

    return { 
      success: res.ok, 
      data: data, 
      messages: messageId ? [{ id: messageId }] : [] // Simula o formato da Meta
    };

  } catch (error) {
    console.error("❌ Erro Evolution API:", error);
    return { success: false, data: null, messages: [], error };
  }
}

export const sendWhatsAppText = sendWhatsAppMessage;