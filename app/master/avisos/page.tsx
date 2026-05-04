import { prisma } from "@/lib/prisma";
import { Megaphone, Trash2 } from "lucide-react";
import { revalidatePath } from "next/cache";

export default async function AvisosMasterPage() {
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' }
  });

  async function createAnnouncement(formData: FormData) {
    "use server";
    const content = formData.get("content") as string;
    await prisma.announcement.create({ data: { content } });
    revalidatePath("/master/avisos");
  }

  async function deleteAnnouncement(id: string) {
    "use server";
    await prisma.announcement.delete({ where: { id } });
    revalidatePath("/master/avisos");
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white">Avisos Globais</h2>
        <p className="text-zinc-400 mt-1">Mande mensagens para todos os barbeiros da plataforma.</p>
      </div>

      {/* Formulário de Criação */}
      <form action={createAnnouncement} className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 space-y-4">
        <textarea 
          name="content"
          placeholder="Digite o aviso aqui... (Ex: Nova funcionalidade de estoque liberada!)"
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
          rows={3}
        />
        <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-medium transition-colors">
          Publicar Aviso
        </button>
      </form>

      {/* Lista de Avisos Ativos */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Histórico de Avisos</h3>
        {announcements.map(aviso => (
          <div key={aviso.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg flex justify-between items-center">
            <div className="flex-1">
              <p className="text-zinc-300">{aviso.content}</p>
              <span className="text-xs text-zinc-500">{new Date(aviso.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
            <form>
              <button 
                formAction={async () => { "use server"; await deleteAnnouncement(aviso.id); }}
                className="text-red-500 hover:text-red-400 p-2"
              >
                <Trash2 size={18} />
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}