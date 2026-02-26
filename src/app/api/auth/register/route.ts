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

  const invitation = db.prepare(
    "SELECT * FROM invitations WHERE token = ? AND used_by IS NULL AND expires_at > datetime('now')"
  ).get(token) as Invitation | undefined;

  if (!invitation) {
    return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 });
  }

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username.trim());
  if (existing) {
    return NextResponse.json({ error: "Username already taken" }, { status: 400 });
  }

  const passwordHash = hashPassword(password);

  const insertUser = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
  const markUsed = db.prepare("UPDATE invitations SET used_by = ?, used_at = datetime('now') WHERE id = ?");

  const transaction = db.transaction(() => {
    const result = insertUser.run(username.trim(), passwordHash);
    const userId = result.lastInsertRowid as number;
    markUsed.run(userId, invitation.id);
    return userId;
  });

  const userId = transaction();

  const sessionToken = await createToken(userId, username.trim());
  await setSessionCookie(sessionToken);

  return NextResponse.json({ success: true });
}
