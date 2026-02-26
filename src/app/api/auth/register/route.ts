import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { hashPassword, createToken, setSessionCookie } from "@/lib/auth";
import type { Invitation } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { token, username, password } = await request.json();

  if (!token || !username || !password) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  if (username.length < 2 || username.length > 20) {
    return NextResponse.json({ error: "Username must be 2-20 characters" }, { status: 400 });
  }

  if (password.length < 4) {
    return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
  }

  const invResult = await db.execute({
    sql: "SELECT * FROM invitations WHERE token = ? AND used_by IS NULL AND expires_at > datetime('now')",
    args: [token],
  });

  const invitation = invResult.rows[0] as unknown as Invitation | undefined;

  if (!invitation) {
    return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 });
  }

  const existingResult = await db.execute({
    sql: "SELECT id FROM users WHERE username = ?",
    args: [username.trim()],
  });

  if (existingResult.rows.length > 0) {
    return NextResponse.json({ error: "Username already taken" }, { status: 400 });
  }

  const passwordHash = hashPassword(password);

  const insertResult = await db.execute({
    sql: "INSERT INTO users (username, password_hash) VALUES (?, ?)",
    args: [username.trim(), passwordHash],
  });

  const userId = Number(insertResult.lastInsertRowid);

  await db.execute({
    sql: "UPDATE invitations SET used_by = ?, used_at = datetime('now') WHERE id = ?",
    args: [userId, invitation.id],
  });

  const sessionToken = await createToken(userId, username.trim());
  await setSessionCookie(sessionToken);

  return NextResponse.json({ success: true });
}
