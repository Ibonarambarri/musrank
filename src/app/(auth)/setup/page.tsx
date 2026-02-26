"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }

    router.push("/");
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="text-lg font-medium mb-1">musrank</h1>
      <p className="text-sm text-neutral-400 mb-8">Crear primer usuario</p>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <label className="block text-sm text-neutral-400 mb-1">Usuario</label>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm mb-4 outline-none focus:border-blue-500"
        autoFocus
        required
      />

      <label className="block text-sm text-neutral-400 mb-1">Contrasena</label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm mb-6 outline-none focus:border-blue-500"
        required
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-500 text-white text-sm font-medium py-2 rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
      >
        {loading ? "Creando..." : "Crear cuenta"}
      </button>
    </form>
  );
}
