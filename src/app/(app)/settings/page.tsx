"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="max-w-lg mx-auto px-4 pt-8">
      <h1 className="text-lg font-medium mb-6">Configuracion</h1>

      <InviteSection />
      <div className="border-t border-border my-6" />
      <PasswordSection />
      <div className="border-t border-border my-6" />

      <button
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/login");
        }}
        className="text-sm text-red-400 hover:text-red-300 transition-colors"
      >
        Cerrar sesion
      </button>
    </div>
  );
}

function InviteSection() {
  const [inviteLink, setInviteLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generateLink() {
    setLoading(true);
    const res = await fetch("/api/invitations", { method: "POST" });
    const data = await res.json();
    const link = `${window.location.origin}/register/${data.token}`;
    setInviteLink(link);
    setLoading(false);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <h2 className="text-sm font-medium mb-2">Invitar jugador</h2>
      <p className="text-xs text-muted mb-3">
        Genera un enlace de un solo uso. Caduca en 72 horas.
      </p>

      {!inviteLink ? (
        <button
          onClick={generateLink}
          disabled={loading}
          className="text-sm text-blue-500 hover:text-blue-400 font-medium disabled:opacity-50 transition-colors"
        >
          {loading ? "Generando..." : "Generar enlace"}
        </button>
      ) : (
        <div>
          <div className="bg-surface border border-border rounded px-3 py-2 text-xs font-mono break-all mb-2">
            {inviteLink}
          </div>
          <button
            onClick={copyLink}
            className="text-xs text-blue-500 hover:text-blue-400 transition-colors"
          >
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      )}
    </div>
  );
}

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    const res = await fetch("/api/auth/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setLoading(false);
  }

  return (
    <div>
      <h2 className="text-sm font-medium mb-3">Cambiar contrasena</h2>
      <form onSubmit={handleSubmit}>
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
        {success && <p className="text-green-500 text-xs mb-2">Contrasena actualizada</p>}

        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Contrasena actual"
          className="w-full bg-surface border border-border rounded px-3 py-2 text-sm mb-2 outline-none focus:border-blue-500"
          required
        />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Nueva contrasena"
          className="w-full bg-surface border border-border rounded px-3 py-2 text-sm mb-3 outline-none focus:border-blue-500"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="text-sm text-blue-500 hover:text-blue-400 font-medium disabled:opacity-50 transition-colors"
        >
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </form>
    </div>
  );
}
