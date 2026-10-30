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

const DB_VERSION = 1;
const currentVersion = db.pragma('user_version', { simple: true }) as number;

if (currentVersion < DB_VERSION) {
  const rows = db
    .prepare(`SELECT id, email_date FROM rejections`)
    .all() as { id: number; email_date: string }[];

  const update = db.prepare(`UPDATE rejections SET email_date = ? WHERE id = ?`);

  const migrate = db.transaction((items: { id: number; email_date: string }[]) => {
    for (const row of items) {
      const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(row.email_date);
      if (m) update.run(`${m[3]}-${m[2]}-${m[1]}`, row.id);
    }
  });

  migrate(rows);
  db.pragma(`user_version = ${DB_VERSION}`);
  console.log(`[db] migrated to v${DB_VERSION}`);
}

export default db;