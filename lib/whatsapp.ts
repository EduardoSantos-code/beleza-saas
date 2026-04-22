type SendWhatsAppTextInput = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  text: string;
  replyToMessageId?: string;
};

export async function sendWhatsAppText(input: SendWhatsAppTextInput) {
  const apiVersion = process.env.WHATSAPP_API_VERSION || "v20.0";
  const url = `https://graph.facebook.com/${apiVersion}/${input.phoneNumberId}/messages`;

  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to: input.to.replace("+", ""),
    type: "text",
    text: {
      preview_url: false,
      body: input.text,
    },
  };

  if (input.replyToMessageId) {
    body.context = {
      message_id: input.replyToMessageId,
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Erro WhatsApp API:", data);
    throw new Error(
      data?.error?.message || "Erro ao enviar mensagem pelo WhatsApp"
    );
  }

  return data;
}