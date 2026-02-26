import db from "@/lib/db";
import { getRank, type User } from "@/lib/types";
import { autoAcceptExpiredMatches, getPlayerStats } from "@/lib/matches";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  await autoAcceptExpiredMatches();

  const result = await db.execute("SELECT * FROM users ORDER BY elo DESC");
  const users = result.rows as unknown as User[];

  const players = await Promise.all(
    users.map(async (user, index) => ({
      ...user,
      position: index + 1,
      rank: getRank(user.elo),
      ...(await getPlayerStats(user.id)),
    }))
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-8">
      <h1 className="text-lg font-medium mb-6">Ranking</h1>

      {players.length === 0 ? (
        <p className="text-sm text-muted">No hay jugadores todavia.</p>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center text-xs text-muted px-2 pb-2">
            <span className="w-8">#</span>
            <span className="flex-1">Jugador</span>
            <span className="w-20 text-right">ELO</span>
            <span className="w-16 text-right">V-D</span>
          </div>

          {players.map((player) => (
            <Link
              key={player.id}
              href={`/player/${player.id}`}
              className="flex items-center px-2 py-3 rounded hover:bg-surface transition-colors"
            >
              <span className="w-8 text-sm text-muted font-mono">
                {player.position}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium block truncate">
                  {player.username}
                </span>
                <span className="text-xs text-muted">{player.rank}</span>
              </div>
              <span className="w-20 text-right text-sm font-mono">
                {player.elo}
              </span>
              <span className="w-16 text-right text-xs text-muted font-mono">
                {player.wins}-{player.losses}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
