import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import db from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000)
    .toISOString()
    .replace("T", " ")
    .split(".")[0];

  await db.execute({
    sql: "INSERT INTO invitations (token, created_by, expires_at) VALUES (?, ?, ?)",
    args: [token, session.userId, expiresAt],
  });

  return NextResponse.json({ token });
}
