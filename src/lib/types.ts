export interface User {
  id: number;
  username: string;
  password_hash: string;
  elo: number;
  created_at: string;
}

export interface Match {
  id: number;
  team1_player1: number;
  team1_player2: number;
  team2_player1: number;
  team2_player2: number;
  team1_score: number;
  team2_score: number;
  status: "pending" | "accepted" | "rejected";
  created_by: number;
  validated_by: number | null;
  created_at: string;
  resolved_at: string | null;
}

export interface Invitation {
  id: number;
  token: string;
  created_by: number;
  used_by: number | null;
  expires_at: string;
  used_at: string | null;
}

export interface PlayerStats {
  id: number;
  username: string;
  elo: number;
  rank: string;
  wins: number;
  losses: number;
  games: number;
  winrate: number;
}

export interface MatchWithPlayers extends Match {
  team1_player1_name: string;
  team1_player2_name: string;
  team2_player1_name: string;
  team2_player2_name: string;
}

export function getRank(elo: number): string {
  if (elo < 950) return "Novato";
  if (elo < 1100) return "Aprendiz";
  if (elo < 1250) return "Jugador";
  if (elo < 1400) return "Maestro";
  return "Txapeldun";
}
