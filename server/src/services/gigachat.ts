import 'dotenv/config';
import GigaChat from 'gigachat';
import { Agent } from 'node:https';
import sharp from 'sharp';
import { createLogger } from '../lib/logger';

const log = createLogger('gigachat');

const GIGACHAT_TIMEOUT_SEC = Number(process.env.GIGACHAT_TIMEOUT_SEC ?? 600);
const GIGACHAT_TEMPERATURE = 0.1;
const JPEG_QUALITY = 90;

// GigaChat использует сертификаты НУЦ Минцифры; у Node нет их в store.
// НЕ «чинить» без явной замены на custom CA.
const httpsAgent = new Agent({ rejectUnauthorized: false });

const client = new GigaChat({
    timeout: GIGACHAT_TIMEOUT_SEC,
    model: 'GigaChat-2-Max',
    credentials: process.env.GIGACHAT_CREDENTIALS!,
    scope: process.env.GIGACHAT_SCOPE || 'GIGACHAT_API_PERS',
    httpsAgent,
});

export interface ParsedRejection {
    vacancy: string;
    company: string;
    date: string | null;
}

export type ParseResult =
    | { ok: true; data: ParsedRejection }
    | { ok: false; reason: 'ai_error' | 'bad_json' | 'empty' };

const PROMPT = `
Ты — эксперт по парсингу данных. На изображении — скриншот письма или страницы с отказом в приеме на работу.
Извлеки из него информацию и верни СТРОГО валидный JSON без каких-либо пояснений, markdown-разметки или лишнего текста.
Формат JSON:
{
    "vacancy": "название должности/вакансии",
    "company": "название компании",
    "date": "дата отказа в формате YYYY-MM-DD (если есть полная дата, иначе null)"
}
Если какое-то поле не найдено, оставь пустую строку или null.
`;

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

export async function parseRejectionScreenshot(
    imageBuffer: Buffer,
    mimeType: string
): Promise<ParseResult> {
    try {
        const jpegBuffer =
            mimeType === 'image/jpeg'
                ? imageBuffer
                : await sharp(imageBuffer).jpeg({ quality: JPEG_QUALITY }).toBuffer();

        const file = new File([new Uint8Array(jpegBuffer)], 'screenshot.jpg', {
            type: 'image/jpeg',
        });

        const uploadedFile = await client.uploadFile(file);

        const response = await client.chat({
            messages: [
                { role: 'user', content: PROMPT, attachments: [uploadedFile.id] },
            ],
            temperature: GIGACHAT_TEMPERATURE,
        });

        const content = response.choices[0]?.message.content || '';
        log.debug('raw AI response:', content);

        try {
            const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleaned) as unknown;

            if (parsed === null || typeof parsed !== 'object') {
                return { ok: false, reason: 'bad_json' };
            }
            const obj = parsed as Record<string, unknown>;

            const data: ParsedRejection = {
                vacancy: asString(obj.vacancy),
                company: asString(obj.company),
                date: typeof obj.date === 'string' && obj.date ? obj.date : null,
            };

            if (!data.vacancy && !data.company && !data.date) {
                return { ok: false, reason: 'empty' };
            }
            return { ok: true, data };
        } catch (e) {
            log.error('failed to parse AI response:', content, e);
            return { ok: false, reason: 'bad_json' };
        }
    } catch (e) {
        log.error('GigaChat request failed:', e);
        return { ok: false, reason: 'ai_error' };
    }
}