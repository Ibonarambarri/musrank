"use client";

import { useState, useEffect, useCallback } from "react";
import type { MatchWithPlayers } from "@/lib/types";

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchWithPlayers[]>([]);
  const [players, setPlayers] = useState<{ id: number; username: string }[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [filterPlayer, setFilterPlayer] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [matchesRes, playersRes, sessionRes] = await Promise.all([
      fetch(`/api/matches${filterPlayer ? `?player=${filterPlayer}` : ""}`),
      fetch("/api/players"),
      fetch("/api/auth/me"),
    ]);
    setMatches(await matchesRes.json());
    setPlayers(await playersRes.json());
    const sessionData = await sessionRes.json();
    setCurrentUserId(sessionData.userId);
    setLoading(false);
  }, [filterPlayer]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pending = matches.filter(
    (m) => m.status === "pending" && currentUserId &&
      (m.team2_player1 === currentUserId || m.team2_player2 === currentUserId)
  );
  const all = matches;

  async function handleAction(matchId: number, action: "accept" | "reject") {
    await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    fetchData();
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-8">
        <p className="text-sm text-muted">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-medium">Partidas</h1>
        <button
          onClick={() => setShowForm(true)}
          className="text-sm text-blue-500 hover:text-blue-400 font-medium transition-colors"
        >
          + Nueva
        </button>
      </div>

      {showForm && (
        <NewMatchForm
          players={players}
          currentUserId={currentUserId!}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            fetchData();
          }}
        />
      )}

      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs text-muted uppercase tracking-wide mb-3">
            Pendientes de validar
          </h2>
          {pending.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              showActions
              onAction={handleAction}
            />
          ))}
        </div>
      )}

      <div className="mb-4">
        <select
          value={filterPlayer}
          onChange={(e) => setFilterPlayer(e.target.value)}
          className="bg-surface border border-border rounded px-3 py-1.5 text-xs outline-none"
        >
          <option value="">Todos los jugadores</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>{p.username}</option>
          ))}
        </select>
      </div>

      {all.length === 0 ? (
        <p className="text-sm text-muted">No hay partidas.</p>
      ) : (
        <div className="space-y-1">
          {all.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}

function MatchCard({
  match,
  showActions,
  onAction,
}: {
  match: MatchWithPlayers;
  showActions?: boolean;
  onAction?: (id: number, action: "accept" | "reject") => void;
}) {
  const date = new Date(match.created_at + "Z").toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });

  const statusLabel = {
    pending: "pendiente",
    accepted: "aceptada",
    rejected: "rechazada",
  }[match.status];

  const statusColor = {
    pending: "text-yellow-500",
    accepted: "text-green-500",
    rejected: "text-red-400",
  }[match.status];

  const team1Won = match.team1_score > match.team2_score;

  return (
    <div className="px-2 py-3 rounded hover:bg-surface transition-colors">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted">{date}</span>
        <span className={`text-xs ${statusColor}`}>{statusLabel}</span>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <div className={`flex-1 text-right ${team1Won ? "font-medium" : "text-muted"}`}>
          <span className="truncate">{match.team1_player1_name}</span>
          <span className="text-muted"> / </span>
          <span className="truncate">{match.team1_player2_name}</span>
        </div>
        <span className="font-mono text-xs text-muted">
          {match.team1_score} - {match.team2_score}
        </span>
        <div className={`flex-1 ${!team1Won ? "font-medium" : "text-muted"}`}>
          <span className="truncate">{match.team2_player1_name}</span>
          <span className="text-muted"> / </span>
          <span className="truncate">{match.team2_player2_name}</span>
        </div>
      </div>

      {showActions && onAction && (
        <div className="flex gap-2 mt-2 justify-end">
          <button
            onClick={() => onAction(match.id, "reject")}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Rechazar
          </button>
          <button
            onClick={() => onAction(match.id, "accept")}
            className="text-xs text-green-500 hover:text-green-400 font-medium transition-colors"
          >
            Aceptar
          </button>
        </div>
      )}
    </div>
  );
}

function NewMatchForm({
  players,
  currentUserId,
  onClose,
  onCreated,
}: {
  players: { id: number; username: string }[];
  currentUserId: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [teammate, setTeammate] = useState("");
  const [opponent1, setOpponent1] = useState("");
  const [opponent2, setOpponent2] = useState("");
  const [team1Score, setTeam1Score] = useState("");
  const [team2Score, setTeam2Score] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const otherPlayers = players.filter((p) => p.id !== currentUserId);
  const currentUser = players.find((p) => p.id === currentUserId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teammate: Number(teammate),
        opponent1: Number(opponent1),
        opponent2: Number(opponent2),
        team1Score: Number(team1Score),
        team2Score: Number(team2Score),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setSubmitting(false);
      return;
    }

    onCreated();
  }

  return (
    <div className="bg-surface border border-border rounded p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium">Nueva partida</h2>
        <button onClick={onClose} className="text-xs text-muted hover:text-foreground transition-colors">
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        <div className="mb-4">
          <label className="block text-xs text-muted mb-1">Equipo 1</label>
          <div className="text-sm mb-1">{currentUser?.username} (tu)</div>
          <select
            value={teammate}
            onChange={(e) => setTeammate(e.target.value)}
            className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm outline-none focus:border-blue-500"
            required
          >
            <option value="">Companero...</option>
            {otherPlayers
              .filter((p) => String(p.id) !== opponent1 && String(p.id) !== opponent2)
              .map((p) => (
                <option key={p.id} value={p.id}>{p.username}</option>
              ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-muted mb-1">Equipo 2</label>
          <select
            value={opponent1}
            onChange={(e) => setOpponent1(e.target.value)}
            className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm mb-2 outline-none focus:border-blue-500"
            required
          >
            <option value="">Rival 1...</option>
            {otherPlayers
              .filter((p) => String(p.id) !== teammate && String(p.id) !== opponent2)
              .map((p) => (
                <option key={p.id} value={p.id}>{p.username}</option>
              ))}
          </select>
          <select
            value={opponent2}
            onChange={(e) => setOpponent2(e.target.value)}
            className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm outline-none focus:border-blue-500"
            required
          >
            <option value="">Rival 2...</option>
            {otherPlayers
              .filter((p) => String(p.id) !== teammate && String(p.id) !== opponent1)
              .map((p) => (
                <option key={p.id} value={p.id}>{p.username}</option>
              ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-muted mb-1">Resultado</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={team1Score}
              onChange={(e) => setTeam1Score(e.target.value)}
              placeholder="Eq. 1"
              className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm font-mono text-center outline-none focus:border-blue-500"
              required
            />
            <span className="text-muted text-sm">-</span>
            <input
              type="number"
              min="0"
              value={team2Score}
              onChange={(e) => setTeam2Score(e.target.value)}
              placeholder="Eq. 2"
              className="w-full bg-background border border-border rounded px-3 py-1.5 text-sm font-mono text-center outline-none focus:border-blue-500"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-500 text-white text-sm font-medium py-2 rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Registrando..." : "Registrar partida"}
        </button>
      </form>
    </div>
  );
}
