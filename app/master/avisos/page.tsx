import { prisma } from "@/lib/prisma";
import { Megaphone, Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";
import { revalidatePath } from "next/cache";

export default async function AvisosMasterPage() {
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
  });

  async function createAnnouncement(formData: FormData) {
    "use server";

    const content = String(formData.get("content") || "").trim();

    if (!content) {
      return;
    }

    await prisma.announcement.create({
      data: { content },
    });

    revalidatePath("/master/avisos");
  }

  async function deleteAnnouncement(id: string) {
    "use server";

    await prisma.announcement.delete({ where: { id } });
    revalidatePath("/master/avisos");
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Avisos Globais
        </h2>
        <p className="mt-1 text-sm text-zinc-400 sm:text-base">
          Mande mensagens para todos os barbeiros da plataforma.
        </p>
      </div>

      {/* Formulário de Criação */}
      <form
        action={createAnnouncement}
        className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-zinc-800 p-2 text-emerald-400">
            <Megaphone size={18} />
          </div>
          <h3 className="text-base font-semibold text-white sm:text-lg">
            Novo aviso
          </h3>
        </div>

        <textarea
          name="content"
          placeholder="Digite o aviso aqui... (Ex: Nova funcionalidade de estoque liberada!)"
          className="min-h-[120px] w-full rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-white outline-none transition focus:ring-2 focus:ring-emerald-500 sm:text-base"
          rows={4}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-500 sm:text-sm">
            O aviso ficará visível para os barbeiros na plataforma.
          </p>

          <button className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 sm:w-auto">
            Publicar Aviso
          </button>
        </div>
      </form>

      {/* Lista de Avisos Ativos */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-white sm:text-lg">
          Histórico de Avisos
        </h3>

        {announcements.length === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-500">
            Nenhum aviso publicado ainda.
          </div>
        )}

        {announcements.map((aviso) => (
          <div
            key={aviso.id}
            className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm text-zinc-300 sm:text-base">
                {aviso.content}
              </p>
              <span className="mt-2 block text-xs text-zinc-500">
                {new Date(aviso.createdAt).toLocaleDateString("pt-BR")}
              </span>
            </div>

            <form className="sm:shrink-0">
              <button
                formAction={async () => {
                  "use server";
                  await deleteAnnouncement(aviso.id);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/20 sm:w-auto"
              >
                <Trash2 size={16} />
                Excluir
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
