import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function initDb() {
  await db.batch([
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      elo INTEGER DEFAULT 1000,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team1_player1 INTEGER NOT NULL REFERENCES users(id),
      team1_player2 INTEGER NOT NULL REFERENCES users(id),
      team2_player1 INTEGER NOT NULL REFERENCES users(id),
      team2_player2 INTEGER NOT NULL REFERENCES users(id),
      team1_score INTEGER NOT NULL,
      team2_score INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected')),
      created_by INTEGER NOT NULL REFERENCES users(id),
      validated_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id),
      used_by INTEGER REFERENCES users(id),
      expires_at TEXT NOT NULL,
      used_at TEXT
    )`,
  ]);
}

// Initialize tables on import
const _init = initDb().catch(console.error);

export default db;
