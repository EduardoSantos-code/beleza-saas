import { Smartphone, Wifi, WifiOff, AlertCircle } from "lucide-react";

// Função para buscar o status na VPS (Evolution API)
async function getWhatsAppStatus() {
  const evolutionUrl = process.env.NEXT_PUBLIC_EVOLUTION_URL || process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instanceName = process.env.EVOLUTION_INSTANCE || "TratoMarcado_Master";

  if (!evolutionUrl || !apiKey) {
    return { status: "CONFIG_ERROR" };
  }

  try {
    const res = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
      method: "GET",
      headers: {
        "apikey": apiKey,
      },
      // cache: "no-store" garante que a página sempre pegue o status real da hora
      cache: "no-store" 
    });

    if (!res.ok) {
      return { status: "OFFLINE" };
    }

    const data = await res.json();
    // A Evolution geralmente retorna 'open' para conectado e 'close' para desconectado
    return { status: data?.instance?.state || "UNKNOWN" }; 

  } catch (error) {
    console.error("Erro ao checar Evolution:", error);
    return { status: "OFFLINE" };
  }
}

export default async function WhatsAppMasterPage() {
  const connection = await getWhatsAppStatus();

  // Tratamento visual baseado no status
  const isConnected = connection.status === "open";
  const isConfigError = connection.status === "CONFIG_ERROR";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white">Central do WhatsApp</h2>
        <p className="text-zinc-400 mt-1">Gerencie a conexão do número oficial do TratoMarcado.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card de Status da Conexão */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex flex-col items-center justify-center text-center space-y-4">
          <div className={`p-4 rounded-full ${isConnected ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}>
            {isConnected ? <Wifi size={40} /> : <WifiOff size={40} />}
          </div>
          
          <div>
            <h3 className="text-xl font-bold text-white">
              {isConnected ? "Conectado e Operante" : "Desconectado"}
            </h3>
            <p className="text-zinc-400 mt-1 text-sm">
              Instância: <span className="font-mono text-zinc-300">TratoMarcado_Master</span>
            </p>
          </div>

          {!isConnected && !isConfigError && (
            <p className="text-sm text-red-400 mt-2 bg-red-500/10 py-2 px-4 rounded-md">
              O celular mestre perdeu a conexão. Verifique o aparelho ou leia o QR Code novamente.
            </p>
          )}

          {isConfigError && (
            <p className="text-sm text-amber-400 mt-2 bg-amber-500/10 py-2 px-4 rounded-md flex items-center gap-2">
              <AlertCircle size={16} />
              Variáveis de ambiente da Evolution ausentes na Vercel.
            </p>
          )}
        </div>

        {/* Card de Informações do Aparelho (Placeholder para o futuro) */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Smartphone className="text-blue-500" size={24} />
              <h3 className="text-lg font-bold text-white">Aparelho Host</h3>
            </div>
            <p className="text-zinc-400 text-sm mb-4">
              Este é o aparelho que está disparando as mensagens para todos os salões cadastrados. Mantenha-o sempre carregado e com internet.
            </p>
            <ul className="space-y-3">
              <li className="flex justify-between items-center text-sm border-b border-zinc-800 pb-2">
                <span className="text-zinc-500">Delay de disparo</span>
                <span className="text-zinc-300 font-medium">1.2 segundos</span>
              </li>
              <li className="flex justify-between items-center text-sm border-b border-zinc-800 pb-2">
                <span className="text-zinc-500">Status da VPS (Motor)</span>
                <span className="text-emerald-400 font-medium">Rodando (Porta 8080)</span>
              </li>
            </ul>
          </div>
          
          <button 
            disabled={isConnected}
            className={`mt-6 py-2 px-4 rounded-md font-medium transition-colors ${isConnected ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white"}`}
          >
            {isConnected ? "Nenhuma ação necessária" : "Gerar QR Code de Reconexão"}
          </button>
        </div>
      </div>
    </div>
  );
}