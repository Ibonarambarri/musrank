import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { hashPassword, createToken, setSessionCookie } from "@/lib/auth";
import type { User } from "@/lib/types";

export async function POST(request: NextRequest) {
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (userCount.count > 0) {
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
  const result = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(username.trim(), passwordHash);

  const token = await createToken(result.lastInsertRowid as number, username.trim());
  await setSessionCookie(token);

  return NextResponse.json({ success: true });
}
