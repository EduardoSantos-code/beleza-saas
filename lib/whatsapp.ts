// lib/whatsapp.ts

const EVOLUTION_URL = process.env.EVOLUTION_URL; // Ex: http://seu-ip:8080
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY; // Uma senha que você define
const INSTANCE_NAME = "TratoMarcado_Master"; // Nome da conexão que você vai criar

export async function sendWhatsAppMessage(to: string, message: string) {
  // Limpa o número: remove o '+' e garante que só tenha números
  const cleanNumber = to.replace(/\D/g, "");

  try {
    const res = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY as string,
      },
      body: JSON.stringify({
        number: cleanNumber,
        options: {
          delay: 1200, // Simula uma pessoa digitando (evita ban)
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