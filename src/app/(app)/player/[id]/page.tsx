import db from "@/lib/db";
import { getRank, type User, type MatchWithPlayers } from "@/lib/types";
import { getPlayerStats } from "@/lib/matches";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(id)) as User | undefined;

  if (!user) notFound();

  const stats = getPlayerStats(user.id);
  const rank = getRank(user.elo);

  const matches = db.prepare(`
    SELECT m.*,
      u1.username as team1_player1_name,
      u2.username as team1_player2_name,
      u3.username as team2_player1_name,
      u4.username as team2_player2_name
    FROM matches m
    JOIN users u1 ON m.team1_player1 = u1.id
    JOIN users u2 ON m.team1_player2 = u2.id
    JOIN users u3 ON m.team2_player1 = u3.id
    JOIN users u4 ON m.team2_player2 = u4.id
    WHERE m.status = 'accepted'
      AND (m.team1_player1 = ? OR m.team1_player2 = ? OR m.team2_player1 = ? OR m.team2_player2 = ?)
    ORDER BY m.created_at DESC
  `).all(user.id, user.id, user.id, user.id) as MatchWithPlayers[];

  return (
    <div className="max-w-lg mx-auto px-4 pt-8">
      <h1 className="text-lg font-medium mb-1">{user.username}</h1>
      <p className="text-sm text-muted mb-6">{rank}</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div>
          <div className="text-xs text-muted mb-1">ELO</div>
          <div className="text-sm font-mono">{user.elo}</div>
        </div>
        <div>
          <div className="text-xs text-muted mb-1">Partidas</div>
          <div className="text-sm font-mono">{stats.games}</div>
        </div>
        <div>
          <div className="text-xs text-muted mb-1">V / D</div>
          <div className="text-sm font-mono">{stats.wins} / {stats.losses}</div>
        </div>
        <div>
          <div className="text-xs text-muted mb-1">Winrate</div>
          <div className="text-sm font-mono">{stats.winrate}%</div>
        </div>
      </div>

      <h2 className="text-xs text-muted uppercase tracking-wide mb-3">
        Historial
      </h2>

      {matches.length === 0 ? (
        <p className="text-sm text-muted">Sin partidas todavia.</p>
      ) : (
        <div className="space-y-1">
          {matches.map((match) => {
            const date = new Date(match.created_at + "Z").toLocaleDateString("es-ES", {
              day: "numeric",
              month: "short",
            });
            const team1Won = match.team1_score > match.team2_score;
            const isTeam1 =
              match.team1_player1 === user.id || match.team1_player2 === user.id;
            const won = isTeam1 ? team1Won : !team1Won;

            return (
              <div key={match.id} className="flex items-center px-2 py-2">
                <span className="text-xs text-muted w-16">{date}</span>
                <span className={`text-xs font-medium w-6 ${won ? "text-green-500" : "text-red-400"}`}>
                  {won ? "W" : "L"}
                </span>
                <div className="flex-1 text-xs text-muted truncate">
                  {match.team1_player1_name}/{match.team1_player2_name}
                  <span className="font-mono mx-1">{match.team1_score}-{match.team2_score}</span>
                  {match.team2_player1_name}/{match.team2_player2_name}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
