import db from "@/lib/db";
import { processMatchElo } from "@/lib/elo";
import type { Match, User } from "@/lib/types";

export async function autoAcceptExpiredMatches() {
  const result = await db.execute(
    "SELECT * FROM matches WHERE status = 'pending' AND datetime(created_at, '+24 hours') < datetime('now')"
  );

  for (const row of result.rows) {
    const match = row as unknown as Match;
    await acceptMatch(match);
  }

  return result.rows.length;
}

export async function acceptMatch(match: Match) {
  const [r1, r2, r3, r4] = await Promise.all([
    db.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [match.team1_player1] }),
    db.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [match.team1_player2] }),
    db.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [match.team2_player1] }),
    db.execute({ sql: "SELECT * FROM users WHERE id = ?", args: [match.team2_player2] }),
  ]);

  const p1 = r1.rows[0] as unknown as User;
  const p2 = r2.rows[0] as unknown as User;
  const p3 = r3.rows[0] as unknown as User;
  const p4 = r4.rows[0] as unknown as User;

  const team1Won = match.team1_score > match.team2_score;
  const { team1Change, team2Change } = processMatchElo(
    p1.elo, p2.elo, p3.elo, p4.elo, team1Won
  );

  const validatedBy = match.validated_by ?? null;

  await db.batch([
    { sql: "UPDATE users SET elo = elo + ? WHERE id = ?", args: [team1Change, p1.id] },
    { sql: "UPDATE users SET elo = elo + ? WHERE id = ?", args: [team1Change, p2.id] },
    { sql: "UPDATE users SET elo = elo + ? WHERE id = ?", args: [team2Change, p3.id] },
    { sql: "UPDATE users SET elo = elo + ? WHERE id = ?", args: [team2Change, p4.id] },
    { sql: "UPDATE matches SET status = 'accepted', resolved_at = datetime('now'), validated_by = ? WHERE id = ?", args: [validatedBy, match.id] },
  ]);
}

export async function getPlayerStats(userId: number) {
  const [winsResult, lossesResult] = await Promise.all([
    db.execute({
      sql: `SELECT COUNT(*) as count FROM matches
        WHERE status = 'accepted' AND (
          (team1_score > team2_score AND (team1_player1 = ? OR team1_player2 = ?))
          OR (team2_score > team1_score AND (team2_player1 = ? OR team2_player2 = ?))
        )`,
      args: [userId, userId, userId, userId],
    }),
    db.execute({
      sql: `SELECT COUNT(*) as count FROM matches
        WHERE status = 'accepted' AND (
          (team1_score < team2_score AND (team1_player1 = ? OR team1_player2 = ?))
          OR (team2_score < team1_score AND (team2_player1 = ? OR team2_player2 = ?))
        )`,
      args: [userId, userId, userId, userId],
    }),
  ]);

  const wins = Number(winsResult.rows[0].count);
  const losses = Number(lossesResult.rows[0].count);

  return {
    wins,
    losses,
    games: wins + losses,
    winrate: wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0,
  };
}
