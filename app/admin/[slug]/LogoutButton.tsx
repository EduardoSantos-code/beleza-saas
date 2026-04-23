"use client";

export default function LogoutButton() {
  async function handleLogout() {
    const confirmLogout = window.confirm("Tem certeza que deseja sair?");
    if (!confirmLogout) return;

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      window.location.href = "/login";
    } catch (error) {
      console.error("Erro ao sair:", error);
      alert("Não foi possível sair.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-center text-sm font-medium text-red-600 transition hover:bg-red-100 lg:w-auto"
    >
      Sair
    </button>
  );
}
