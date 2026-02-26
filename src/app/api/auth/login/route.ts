import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyPassword, createToken, setSessionCookie } from "@/lib/auth";
import type { User } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  const result = await db.execute({
    sql: "SELECT * FROM users WHERE username = ?",
    args: [username.trim()],
  });

  const user = result.rows[0] as unknown as User | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await createToken(user.id, user.username);
  await setSessionCookie(token);

  return NextResponse.json({ success: true });
}
