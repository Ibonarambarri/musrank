import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("player");

  let sql = `
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
  `;

  const args: (string | number)[] = [];

  if (playerId) {
    sql += ` WHERE m.team1_player1 = ? OR m.team1_player2 = ? OR m.team2_player1 = ? OR m.team2_player2 = ?`;
    args.push(Number(playerId), Number(playerId), Number(playerId), Number(playerId));
  }

  sql += ` ORDER BY m.created_at DESC`;

  const result = await db.execute({ sql, args });
  return NextResponse.json(result.rows);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teammate, opponent1, opponent2, team1Score, team2Score } = await request.json();

  if (!teammate || !opponent1 || !opponent2 || team1Score == null || team2Score == null) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const playerIds = [session.userId, Number(teammate), Number(opponent1), Number(opponent2)];

  if (new Set(playerIds).size !== 4) {
    return NextResponse.json({ error: "No se puede repetir jugadores" }, { status: 400 });
  }

  if (Number(team1Score) === Number(team2Score)) {
    return NextResponse.json({ error: "No se permiten empates" }, { status: 400 });
  }

  if (Number(team1Score) < 0 || Number(team2Score) < 0) {
    return NextResponse.json({ error: "Los puntos deben ser positivos" }, { status: 400 });
  }

  for (const id of playerIds) {
    const result = await db.execute({ sql: "SELECT id FROM users WHERE id = ?", args: [id] });
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Jugador no encontrado" }, { status: 400 });
    }
  }

  const result = await db.execute({
    sql: `INSERT INTO matches (team1_player1, team1_player2, team2_player1, team2_player2, team1_score, team2_score, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [session.userId, Number(teammate), Number(opponent1), Number(opponent2), Number(team1Score), Number(team2Score), session.userId],
  });

  return NextResponse.json({ id: Number(result.lastInsertRowid) });
}
