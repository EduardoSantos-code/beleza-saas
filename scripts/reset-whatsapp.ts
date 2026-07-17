// scripts/reset-whatsapp.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const evolutionUrl = process.env.EVOLUTION_API_URL;
const apiKey = process.env.EVOLUTION_API_KEY;

if (!connectionString) {
  console.error("Erro: DATABASE_URL não definida no arquivo .env");
  process.exit(1);
}

if (!evolutionUrl || !apiKey) {
  console.error("Erro: EVOLUTION_API_URL ou EVOLUTION_API_KEY não definidas no arquivo .env");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const slug = process.argv[2];

  if (!slug) {
    console.log("Uso: npx tsx scripts/reset-whatsapp.ts <slug-da-barbearia>");
    process.exit(1);
  }

  console.log(`Buscando barbearia com slug: "${slug}"...`);

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: { whatsappConfig: true },
  });

  if (!tenant) {
    console.error(`Erro: Nenhuma barbearia encontrada com o slug "${slug}"`);
    process.exit(1);
  }

  const config = tenant.whatsappConfig;

  if (!config) {
    console.error(`Erro: Nenhuma configuração de WhatsApp encontrada para a barbearia "${tenant.name}"`);
    process.exit(1);
  }

  const instanceName = config.instanceName;

  if (!instanceName) {
    console.error("Erro: O nome da instância não está definido na configuração local.");
    process.exit(1);
  }

  console.log(`\nInformações locais:`);
  console.log(`- Barbearia: ${tenant.name}`);
  console.log(`- ID do Tenant: ${tenant.id}`);
  console.log(`- Instância na Evolution: ${instanceName}`);
  console.log(`- Status atual: ${config.status}`);

  const cleanUrl = evolutionUrl.endsWith("/") ? evolutionUrl.slice(0, -1) : evolutionUrl;

  console.log(`\n1) Solicitando logout da instância na Evolution API...`);
  try {
    const logoutRes = await fetch(`${cleanUrl}/instance/logout/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
    });

    const logoutText = await logoutRes.text();
    console.log(`- Resposta do Logout: Status ${logoutRes.status} - ${logoutText.substring(0, 100)}`);
  } catch (err: any) {
    console.log(`- Erro ao solicitar logout (pode ser ignorado se a instância já estiver offline): ${err.message}`);
  }

  console.log(`\n2) Solicitando exclusão da instância na Evolution API...`);
  try {
    const deleteRes = await fetch(`${cleanUrl}/instance/delete/${encodeURIComponent(instanceName)}`, {
      method: "DELETE",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
    });

    const deleteText = await deleteRes.text();
    console.log(`- Resposta do Delete: Status ${deleteRes.status} - ${deleteText.substring(0, 100)}`);
  } catch (err: any) {
    console.log(`- Erro ao deletar instância na Evolution API: ${err.message}`);
  }

  console.log(`\n3) Atualizando banco de dados local para reiniciar a conexão...`);
  try {
    await prisma.whatsappConfig.update({
      where: { id: config.id },
      data: {
        status: "DISCONNECTED",
        qrCodeBase64: null,
        qrCodeText: null,
        pairingCode: null,
        connectedPhone: null,
        profileName: null,
      },
    });

    console.log("✅ Banco de dados atualizado com sucesso para DISCONNECTED!");
    console.log("Agora você pode ir no painel administrativo e clicar em 'Conectar / gerar QR' para parear novamente.");
  } catch (dbErr: any) {
    console.error(`- Erro ao atualizar o banco de dados: ${dbErr.message}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
