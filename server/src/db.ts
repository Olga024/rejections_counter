import Database from 'better-sqlite3';

const db = new Database('rejections.db');

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS rejections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_date TEXT NOT NULL,
    vacancy TEXT NOT NULL,
    company TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    github_url TEXT,
    note TEXT
  )
`);

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_rejections_unique
  ON rejections (email_date, vacancy, company)
`);

export default db;