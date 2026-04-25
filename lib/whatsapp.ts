// lib/whatsapp.ts

const EVOLUTION_URL = process.env.EVOLUTION_URL; 
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY; 
const INSTANCE_NAME = "TratoMarcado_Master"; 

// 1. Definimos uma interface para o TypeScript não reclamar do objeto que vem do reply/route.ts
interface SendMessageOptions {
  to: string;
  text: string;
  phoneNumberId?: string; // Ignoramos os campos da Meta
  accessToken?: string;   // Ignoramos os campos da Meta
}

export async function sendWhatsAppMessage(
  firstArg: string | SendMessageOptions,
  secondArg?: string
) {
  let to: string;
  let message: string;

  // 2. LÓGICA HÍBRIDA: Verifica se você passou (to, message) ou ({ to, text })
  if (typeof firstArg === "string") {
    to = firstArg;
    message = secondArg || "";
  } else {
    // Aqui ele extrai os dados do objeto que deu erro na Vercel
    to = firstArg.to;
    message = firstArg.text;
  }

  // Limpa o número: remove o '+' e garante que só tenha números
  const cleanNumber = to.replace(/\D/g, "");

  if (!EVOLUTION_URL || !EVOLUTION_API_KEY) {
    console.error("❌ Erro: Variáveis de ambiente da Evolution API não configuradas.");
    return { success: false, error: "Configuração ausente" };
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
          delay: 1200, // Simula uma pessoa digitando
          presence: "composing"
        },
        textMessage: {
          text: message
        }
      }),
    });

    const data = await res.json();
    return { success: res.ok, data };
  } catch (error) {
    console.error("❌ Erro Evolution API:", error);
    return { success: false, error };
  }
}

// 3. Exportamos o apelido para garantir que todos os arquivos achem a função
export const sendWhatsAppText = sendWhatsAppMessage;