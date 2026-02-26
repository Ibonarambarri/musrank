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

  const match = db.prepare("SELECT * FROM matches WHERE id = ?").get(Number(id)) as Match | undefined;

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  if (match.status !== "pending") {
    return NextResponse.json({ error: "Match already resolved" }, { status: 400 });
  }

  // Only opposing team can accept/reject
  const isOpposingTeam =
    session.userId === match.team2_player1 || session.userId === match.team2_player2;

  if (!isOpposingTeam) {
    return NextResponse.json({ error: "Solo el equipo contrario puede validar" }, { status: 403 });
  }

  if (action === "reject") {
    db.prepare("UPDATE matches SET status = 'rejected', resolved_at = datetime('now'), validated_by = ? WHERE id = ?")
      .run(session.userId, match.id);
    return NextResponse.json({ success: true });
  }

  // Accept: update match and recalculate ELO
  match.validated_by = session.userId;
  acceptMatch(match);

  return NextResponse.json({ success: true });
}
