import { createClient, type Client, type InValue } from "@libsql/client";

/**
 * 로컬: DATABASE_URL=file:local.db (SQLite 파일)
 * 배포: DATABASE_URL=libsql://...turso.io + DATABASE_AUTH_TOKEN
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS learner (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  unit_index INTEGER NOT NULL,
  status TEXT NOT NULL,
  state TEXT NOT NULL,
  summary TEXT,
  active_secs INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  ended_at TEXT
);
CREATE INDEX IF NOT EXISTS lessons_date ON lessons(date);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_lesson ON messages(lesson_id);
CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id INTEGER,
  date TEXT NOT NULL,
  step TEXT NOT NULL,
  skill TEXT NOT NULL,
  item_type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  answer TEXT NOT NULL,
  correct INTEGER NOT NULL,
  score INTEGER NOT NULL,
  tags TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS attempts_date ON attempts(date);
CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  note TEXT,
  source TEXT,
  ease REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  due_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(kind, back)
);
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scenario TEXT NOT NULL,
  history TEXT NOT NULL,
  report TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS activity (
  date TEXT PRIMARY KEY,
  secs INTEGER NOT NULL DEFAULT 0
);
`;

let clientPromise: Promise<Client> | null = null;

export function db(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const client = createClient({
        url: process.env.DATABASE_URL || "file:local.db",
        authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
      });
      await client.executeMultiple(SCHEMA);
      return client;
    })();
    clientPromise.catch(() => (clientPromise = null));
  }
  return clientPromise;
}

export type Row = Record<string, InValue>;

export async function all<T = Row>(sql: string, args: InValue[] = []): Promise<T[]> {
  const res = await (await db()).execute({ sql, args });
  return res.rows as unknown as T[];
}

export async function one<T = Row>(sql: string, args: InValue[] = []): Promise<T | null> {
  return (await all<T>(sql, args))[0] ?? null;
}

export async function run(sql: string, args: InValue[] = []): Promise<number> {
  const res = await (await db()).execute({ sql, args });
  return Number(res.lastInsertRowid ?? 0);
}
