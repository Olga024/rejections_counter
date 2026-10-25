import Imap from 'imap';
import { simpleParser } from 'mailparser';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import db from './db';

dotenv.config();

const app = express();
app.use(cors());

app.get('/api/rejections', (_req, res) => {
    const rows = db.prepare(
        'SELECT email_date, vacancy, company FROM rejections ORDER BY email_date DESC'
    ).all();
    res.json(rows);
});

app.listen(3001, () => {
    console.log('API: http://localhost:3001/api/rejections');
});

const imapConfig: Imap.Config = {
    user: process.env.EMAIL_USER!,
    password: process.env.EMAIL_PASS!,
    host: 'imap.rambler.ru',
    port: 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
};

const imap = new Imap(imapConfig);

interface RejectEntry {
    date: Date;
    dateStr: string;
    vacancy: string;
    company: string;
}

const results: RejectEntry[] = [];

const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO rejections (email_date, vacancy, company)
  VALUES (?, ?, ?)
`);

async function fetchCompanyFromHH(vacancyUrl: string): Promise<string | null> {
    try {
        const match = vacancyUrl.match(/\/vacancy\/(\d+)/);
        if (!match) return null;
        const id = match[1];

        const res = await fetch(`https://api.hh.ru/vacancies/${id}`, {
            headers: { 'User-Agent': 'hh-reject-parser/1.0 (olgasvitina@rambler.ru)' }
        });
        if (!res.ok) return null;
        const data = await res.json() as { employer?: { name?: string } };
        return data.employer?.name ?? null;
    } catch {
        return null;
    }
}

function openInbox(cb: (err: Error | null, box: any) => void) {
    imap.openBox('INBOX', true, cb);
}

imap.once('ready', () => {
    openInbox((err, box) => {
        if (err) throw err;

        const startOfYear = `${new Date().getFullYear()}-01-01`;
        const searchCriteria = [
            ['SUBJECT', 'Работодатель не готов пригласить вас'],
            ['SINCE', startOfYear]
        ];

        imap.search(searchCriteria, (err, searchResults) => {
            if (err) throw err;
            if (!searchResults || searchResults.length === 0) {
                console.log('Писем с отказом не найдено.');
                imap.end();
                return;
            }

            const fetch = imap.fetch(searchResults, { bodies: '' });
            const pending: Promise<void>[] = [];

            fetch.on('message', (msg) => {
                let buffer = '';
                msg.on('body', (stream) => {
                    stream.on('data', (chunk) => { buffer += chunk.toString('utf8'); });
                });

                const p = new Promise<void>((resolve) => {
                    msg.once('end', async () => {
                        try {
                            const parsed = await simpleParser(buffer);
                            const date = parsed.date ? parsed.date.toLocaleDateString('ru-RU') : 'Дата не найдена';
                            const text = parsed.text || '';
                            const html = parsed.html || '';

                            let vacancy = 'Не найдена';
                            let company = 'Не найдена';

                            const vacancyMatch = text.match(/Вакансия:\s*([^\n\r]+)/i);
                            if (vacancyMatch) vacancy = vacancyMatch[1].trim();

                            const companyMatch = text.match(/(?:компания|компании|работодатель)\s*:\s*([^\n\r]+)/i);
                            if (companyMatch) company = companyMatch[1].trim();

                            if ((vacancy === 'Не найдена' || company === 'Не найдена') && html) {
                                const cleanHtml = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
                                if (vacancy === 'Не найдена') {
                                    const v = cleanHtml.match(/Вакансия:\s*([^\n\r<]+?)(?=\s{2,}|$)/i);
                                    if (v) vacancy = v[1].trim().substring(0, 150);
                                }
                                if (company === 'Не найдена') {
                                    const c = cleanHtml.match(/(?:компания|компании|работодатель)\s*:\s*([^\n\r<]+?)(?=\s{2,}|$)/i);
                                    if (c) company = c[1].trim().substring(0, 150);
                                }
                            }

                            if (company === 'Не найдена') {
                                const urlMatch =
                                    text.match(/https?:\/\/[^\s]*\/vacancy\/\d+/) ||
                                    html.match(/https?:\/\/[^\s"']*\/vacancy\/\d+/);
                                if (urlMatch) {
                                    const apiCompany = await fetchCompanyFromHH(urlMatch[0]);
                                    if (apiCompany) company = apiCompany;
                                }
                            }

                            const info = insertStmt.run(date, vacancy, company);
                            if (info.changes > 0) {
                                console.log(`  + сохранено: ${vacancy} | ${company}`);
                            } else {
                                console.log(`  = уже в базе: ${vacancy} | ${company}`);
                            }

                            results.push({
                                date: parsed.date ?? new Date(0),
                                dateStr: date,
                                vacancy,
                                company
                            });
                        } catch (parseErr) {
                            console.error('Ошибка парсинга письма:', parseErr);
                        } finally {
                            resolve();
                        }
                    });
                });
                pending.push(p);
            });

            fetch.once('error', (fetchErr) => {
                console.error('Ошибка fetch:', fetchErr);
            });

            fetch.once('end', async () => {
                await Promise.all(pending);

                results.sort((a, b) => b.date.getTime() - a.date.getTime());

                console.log('=== Отказы с HeadHunter (сохранены в БД) ===');
                for (const r of results) {
                    console.log(`${r.dateStr} | ${r.vacancy} | ${r.company}`);
                }
                console.log(`Всего обработано: ${results.length}`);

                imap.end();
            });
        });
    });
});

imap.once('error', (err: Error) => {
    console.error('Ошибка IMAP:', err);
});

imap.once('end', () => {
    console.log('Соединение закрыто.');
    db.close();
});

imap.connect();