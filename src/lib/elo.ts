const K = 32;

export function calculateEloChange(
  teamElo: number,
  opponentElo: number,
  won: boolean
): number {
  const expected = 1 / (1 + Math.pow(10, (opponentElo - teamElo) / 400));
  const result = won ? 1 : 0;
  return Math.round(K * (result - expected));
}

export function processMatchElo(
  team1Player1Elo: number,
  team1Player2Elo: number,
  team2Player1Elo: number,
  team2Player2Elo: number,
  team1Won: boolean
): { team1Change: number; team2Change: number } {
  const team1Avg = (team1Player1Elo + team1Player2Elo) / 2;
  const team2Avg = (team2Player1Elo + team2Player2Elo) / 2;

  const team1Change = calculateEloChange(team1Avg, team2Avg, team1Won);
  const team2Change = -team1Change;

  return { team1Change, team2Change };
}
