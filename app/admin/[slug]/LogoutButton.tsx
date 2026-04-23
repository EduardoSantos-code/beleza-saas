"use client";

export default function LogoutButton() {
  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      window.location.href = "/login";
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