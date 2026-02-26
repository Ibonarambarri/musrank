import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { User } from "@/lib/types";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = db.prepare("SELECT id, username FROM users ORDER BY username").all() as Pick<User, "id" | "username">[];
  return NextResponse.json(users);
}
