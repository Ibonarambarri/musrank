import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/auth";
import { acceptMatch } from "@/lib/matches";
import type { Match } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { action } = await request.json();

  if (action !== "accept" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const result = await db.execute({
    sql: "SELECT * FROM matches WHERE id = ?",
    args: [Number(id)],
  });

  const match = result.rows[0] as unknown as Match | undefined;

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  if (match.status !== "pending") {
    return NextResponse.json({ error: "Match already resolved" }, { status: 400 });
  }

  const isOpposingTeam =
    session.userId === match.team2_player1 || session.userId === match.team2_player2;

  if (!isOpposingTeam) {
    return NextResponse.json({ error: "Solo el equipo contrario puede validar" }, { status: 403 });
  }

  if (action === "reject") {
    await db.execute({
      sql: "UPDATE matches SET status = 'rejected', resolved_at = datetime('now'), validated_by = ? WHERE id = ?",
      args: [session.userId, match.id],
    });
    return NextResponse.json({ success: true });
  }

  match.validated_by = session.userId;
  await acceptMatch(match);

  return NextResponse.json({ success: true });
}
