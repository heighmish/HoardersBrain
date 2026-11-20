import { schema } from "@/db/schema";
import Database from "better-sqlite3";
import { BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type JournalEntry = { idx: number; tag: string };

const drizzleDir = join(__dirname, "..", "drizzle");

export type TestDatabase = BetterSQLite3Database<typeof schema>;

export const createTestDb = (): TestDatabase => {
  const sqlite = new Database(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");

  const journal = JSON.parse(
    readFileSync(join(drizzleDir, "meta", "_journal.json"), "utf8"),
  ) as { entries: JournalEntry[] };

  const entries = [...journal.entries].sort((a, b) => a.idx - b.idx);
  for (const entry of entries) {
    const sql = readFileSync(join(drizzleDir, `${entry.tag}.sql`), "utf8");
    sqlite.exec(sql);
  }

  return drizzle(sqlite, { schema });
};
