// lib/asaas.ts

const ASAAS_API_URL = process.env.ASAAS_API_URL; // https://sandbox.asaas.com/api/v3 ou https://api.asaas.com/v3
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

const headers = {
  'Content-Type': 'application/json',
  'access_token': ASAAS_API_KEY || '',
};

export const asaasProvider = {
  // 1. Criar Cliente
  createCustomer: async (name: string, cpfCnpj: string, email: string) => {
    const res = await fetch(`${ASAAS_API_URL}/customers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, cpfCnpj, email }),
    });
    return res.json();
  },

  // 2. Criar Assinatura (Recorrência)
  createSubscription: async (customerId: string, value: number) => {
    const res = await fetch(`${ASAAS_API_URL}/subscriptions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customer: customerId,
        billingType: 'UNDEFINED', // Permite que o cliente escolha entre Boleto, Cartão ou Pix
        value: value,
        nextDueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString().split('T')[0], // 3 dias pra frente
        cycle: 'MONTHLY',
        description: 'Assinatura Plano Mensal - TratoMarcado',
      }),
    });
    return res.json();
  },
};