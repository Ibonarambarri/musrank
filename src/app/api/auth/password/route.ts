import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";
import type { User } from "@/lib/types";

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Both passwords required" }, { status: 400 });
  }

  if (newPassword.length < 4) {
    return NextResponse.json({ error: "New password must be at least 4 characters" }, { status: 400 });
  }

  const result = await db.execute({
    sql: "SELECT * FROM users WHERE id = ?",
    args: [session.userId],
  });
  const user = result.rows[0] as unknown as User;

  if (!verifyPassword(currentPassword, user.password_hash)) {
    return NextResponse.json({ error: "Contrasena actual incorrecta" }, { status: 400 });
  }

  const newHash = hashPassword(newPassword);
  await db.execute({
    sql: "UPDATE users SET password_hash = ? WHERE id = ?",
    args: [newHash, session.userId],
  });

  return NextResponse.json({ success: true });
}
