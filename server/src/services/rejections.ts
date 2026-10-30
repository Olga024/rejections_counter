import db from '../db';
import type {
    RejectionRow,
    InsertRejectionInput,
    InsertRejectionResult,
} from '../types';

const insertStmt = db.prepare(`
  INSERT INTO rejections (email_date, vacancy, company, github_url, note)
  VALUES (@email_date, @vacancy, @company, @github_url, @note)
  ON CONFLICT(email_date, vacancy, company) DO NOTHING
  RETURNING id
`);

const listStmt = db.prepare(`
  SELECT email_date, vacancy, company
  FROM rejections
  ORDER BY email_date DESC
`);

export function insertRejection(input: InsertRejectionInput): InsertRejectionResult {
    const row = insertStmt.get({
        email_date: input.email_date,
        vacancy: input.vacancy,
        company: input.company,
        github_url: input.github_url ?? null,
        note: input.note ?? null,
    }) as { id: number } | undefined;

    return { inserted: Boolean(row), id: row?.id ?? null };
}

export function listRejections(): RejectionRow[] {
    return listStmt.all() as RejectionRow[];
}