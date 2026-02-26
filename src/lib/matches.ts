import db from "@/lib/db";
import { processMatchElo } from "@/lib/elo";
import type { Match, User } from "@/lib/types";

export function autoAcceptExpiredMatches() {
  const expired = db.prepare(
    "SELECT * FROM matches WHERE status = 'pending' AND datetime(created_at, '+24 hours') < datetime('now')"
  ).all() as Match[];

  for (const match of expired) {
    acceptMatch(match);
  }

  return expired.length;
}

export function acceptMatch(match: Match) {
  const p1 = db.prepare("SELECT * FROM users WHERE id = ?").get(match.team1_player1) as User;
  const p2 = db.prepare("SELECT * FROM users WHERE id = ?").get(match.team1_player2) as User;
  const p3 = db.prepare("SELECT * FROM users WHERE id = ?").get(match.team2_player1) as User;
  const p4 = db.prepare("SELECT * FROM users WHERE id = ?").get(match.team2_player2) as User;

  const team1Won = match.team1_score > match.team2_score;
  const { team1Change, team2Change } = processMatchElo(
    p1.elo, p2.elo, p3.elo, p4.elo, team1Won
  );

  const updateElo = db.prepare("UPDATE users SET elo = elo + ? WHERE id = ?");
  const updateMatch = db.prepare(
    "UPDATE matches SET status = 'accepted', resolved_at = datetime('now'), validated_by = ? WHERE id = ?"
  );

  const transaction = db.transaction((validatedBy: number | null) => {
    updateElo.run(team1Change, p1.id);
    updateElo.run(team1Change, p2.id);
    updateElo.run(team2Change, p3.id);
    updateElo.run(team2Change, p4.id);
    updateMatch.run(validatedBy, match.id);
  });

  transaction(match.validated_by ?? null);
}

export function getPlayerStats(userId: number) {
  const wins = db.prepare(`
    SELECT COUNT(*) as count FROM matches
    WHERE status = 'accepted' AND (
      (team1_score > team2_score AND (team1_player1 = ? OR team1_player2 = ?))
      OR (team2_score > team1_score AND (team2_player1 = ? OR team2_player2 = ?))
    )
  `).get(userId, userId, userId, userId) as { count: number };

  const losses = db.prepare(`
    SELECT COUNT(*) as count FROM matches
    WHERE status = 'accepted' AND (
      (team1_score < team2_score AND (team1_player1 = ? OR team1_player2 = ?))
      OR (team2_score < team1_score AND (team2_player1 = ? OR team2_player2 = ?))
    )
  `).get(userId, userId, userId, userId) as { count: number };

  return {
    wins: wins.count,
    losses: losses.count,
    games: wins.count + losses.count,
    winrate: wins.count + losses.count > 0
      ? Math.round((wins.count / (wins.count + losses.count)) * 100)
      : 0,
  };
}
