import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { hashPassword, createToken, setSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const result = await db.execute("SELECT COUNT(*) as count FROM users");
  if (Number(result.rows[0].count) > 0) {
    return NextResponse.json({ error: "Setup already completed" }, { status: 400 });
  }

  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  if (username.length < 2 || username.length > 20) {
    return NextResponse.json({ error: "Username must be 2-20 characters" }, { status: 400 });
  }

  if (password.length < 4) {
    return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
  }

  const passwordHash = hashPassword(password);
  const insertResult = await db.execute({
    sql: "INSERT INTO users (username, password_hash) VALUES (?, ?)",
    args: [username.trim(), passwordHash],
  });

  const userId = Number(insertResult.lastInsertRowid);
  const token = await createToken(userId, username.trim());
  await setSessionCookie(token);

  return NextResponse.json({ success: true });
}
