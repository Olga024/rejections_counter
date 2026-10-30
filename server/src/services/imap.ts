import Imap from 'imap';
import { simpleParser, type ParsedMail } from 'mailparser';
import { insertRejection } from './rejections';
import { fetchCompanyFromHH } from './hh';
import { toIsoDate } from '../lib/date';
import { createLogger } from '../lib/logger';

const log = createLogger('imap');

const IMAP_CONFIG: Imap.Config = {
    user: process.env.EMAIL_USER!,
    password: process.env.EMAIL_PASS!,
    host: process.env.IMAP_HOST || 'imap.rambler.ru',
    port: Number(process.env.IMAP_PORT ?? 993),
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
};

const SUBJECT_FILTER = 'Работодатель не готов пригласить вас';
const SINCE_DATE = process.env.EMAIL_SINCE || `${new Date().getFullYear()}-01-01`;
const MAX_FIELD_LEN = 150;

const RE_VACANCY = /Вакансия:\s*([^\n\r]+)/i;
const RE_COMPANY = /(?:компания|компании|работодатель)\s*:\s*([^\n\r]+)/i;
const RE_URL = /https?:\/\/[^\s"'<>]*\/vacancy\/\d+/;

function matchField(source: string, re: RegExp): string | null {
    const m = source.match(re);
    if (!m) return null;
    const value = m[1].trim().substring(0, MAX_FIELD_LEN);
    return value || null;
}

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
}

function extractFields(parsed: ParsedMail): { vacancy: string; company: string } {
    const text = parsed.text || '';
    const html = typeof parsed.html === 'string' ? parsed.html : '';

    let vacancy = matchField(text, RE_VACANCY);
    let company = matchField(text, RE_COMPANY);

    if ((!vacancy || !company) && html) {
        const clean = stripHtml(html);
        vacancy = vacancy ?? matchField(clean, RE_VACANCY);
        company = company ?? matchField(clean, RE_COMPANY);
    }

    return {
        vacancy: vacancy ?? 'Не найдена',
        company: company ?? 'Не найдена',
    };
}

async function enrichCompanyFromUrl(parsed: ParsedMail, company: string): Promise<string> {
    if (company !== 'Не найдена') return company;

    const text = parsed.text || '';
    const html = typeof parsed.html === 'string' ? parsed.html : '';
    const url = text.match(RE_URL)?.[0] ?? html.match(RE_URL)?.[0];
    if (!url) return company;

    const apiCompany = await fetchCompanyFromHH(url);
    return apiCompany ?? company;
}

async function processMessage(rawBuffer: string): Promise<void> {
    try {
        const parsed = await simpleParser(rawBuffer);
        const emailDate = toIsoDate(parsed.date ?? new Date());

        const { vacancy, company: companyRaw } = extractFields(parsed);
        const company = await enrichCompanyFromUrl(parsed, companyRaw);

        const result = insertRejection({ email_date: emailDate, vacancy, company });
        const tag = result.inserted ? '+' : '=';
        const text = result.inserted ? 'сохранено' : 'уже в базе';
        log.info(`${tag} ${text}: ${emailDate} | ${vacancy} | ${company}`);
    } catch (e) {
        log.error('failed to process message:', e);
    }
}

export async function parseRejectionsFromInbox(): Promise<void> {
    return new Promise((resolve, reject) => {
        const imap = new Imap(IMAP_CONFIG);

        imap.once('error', (err: Error) => {
            log.error('IMAP connection error:', err);
            reject(err);
        });

        imap.once('end', () => {
            log.info('IMAP connection closed');
            resolve();
        });

        imap.once('ready', () => {
            imap.openBox('INBOX', true, (err) => {
                if (err) {
                    log.error('failed to open INBOX:', err);
                    imap.end();
                    return;
                }

                const searchCriteria: unknown[] = [
                    ['SUBJECT', SUBJECT_FILTER],
                    ['SINCE', SINCE_DATE],
                ];

                imap.search(searchCriteria as any, (searchErr, searchResults) => {
                    if (searchErr) {
                        log.error('IMAP search failed:', searchErr);
                        imap.end();
                        return;
                    }

                    if (!searchResults || searchResults.length === 0) {
                        log.info('Писем с отказом не найдено.');
                        imap.end();
                        return;
                    }

                    const fetchResult = imap.fetch(searchResults, { bodies: '' });
                    const pending: Promise<void>[] = [];

                    fetchResult.on('message', (msg) => {
                        let buffer = '';
                        msg.on('body', (stream: NodeJS.ReadableStream) => {
                            stream.on('data', (chunk: Buffer) => {
                                buffer += chunk.toString('utf8');
                            });
                        });

                        const p = new Promise<void>((resolveMessage) => {
                            msg.once('end', async () => {
                                try {
                                    await processMessage(buffer);
                                } finally {
                                    resolveMessage();
                                }
                            });
                        });
                        pending.push(p);
                    });

                    fetchResult.once('error', (fetchErr) => {
                        log.error('IMAP fetch error:', fetchErr);
                        imap.end();
                    });

                    fetchResult.once('end', async () => {
                        await Promise.allSettled(pending);
                        imap.end();
                    });
                });
            });
        });

        imap.connect();
    });
}