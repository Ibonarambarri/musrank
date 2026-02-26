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

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(session.userId) as User;

  if (!verifyPassword(currentPassword, user.password_hash)) {
    return NextResponse.json({ error: "Contrasena actual incorrecta" }, { status: 400 });
  }

  const newHash = hashPassword(newPassword);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, session.userId);

  return NextResponse.json({ success: true });
}
