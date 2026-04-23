"use client";

import { useState } from "react";

export default function LogoutButton() {
  const [showModal, setShowModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    try {
      setIsLoggingOut(true);
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      window.location.href = "/login";
    } catch (error) {
      console.error("Erro ao sair:", error);
      alert("Não foi possível sair.");
      setIsLoggingOut(false);
      setShowModal(false);
    }
  }

  return (
    <>
      {/* Botão original do Menu */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-center text-sm font-medium text-red-600 transition hover:bg-red-100 lg:w-auto"
      >
        Sair
      </button>

      {/* Modal do Tailwind */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          {/* Caixa do Modal */}
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-zinc-200 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-semibold text-zinc-900">
              Sair do sistema
            </h3>
            <p className="mt-2 text-sm text-zinc-600">
              Tem certeza que deseja sair? Você precisará fazer login novamente para acessar o painel.
            </p>

            {/* Botões do Modal */}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isLoggingOut}
                className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition"
              >
                {isLoggingOut ? "Saindo..." : "Sim, sair"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
