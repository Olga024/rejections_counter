import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { asyncHandler } from '../lib/asyncHandler';
import { insertRejection, listRejections } from '../services/rejections';
import { parseRejectionScreenshot } from '../services/gigachat';
import { toIsoDate, parseAnyDate, normalizeIsoDate } from '../lib/date';
import { createLogger } from '../lib/logger';

const log = createLogger('api');

const MAX_UPLOAD_MB = 15;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
});

const emptyToNull = (v: unknown) => (v === '' ? null : v);

const RejectionBodySchema = z.object({
    email_date: z
        .string()
        .refine((v) => parseAnyDate(v) !== null, 'email_date: invalid date'),
    vacancy: z.string().min(1).max(500),
    company: z.string().min(1).max(500),
    github_url: z.preprocess(
        emptyToNull,
        z.string().url().nullable().optional()
    ),
    note: z.preprocess(
        emptyToNull,
        z.string().max(5000).nullable().optional()
    ),
});

export const apiRouter = Router();

apiRouter.get('/rejections', (_req: Request, res: Response) => {
    res.json({ data: listRejections() });
});

apiRouter.post('/rejections', (req: Request, res: Response) => {
    const parsed = RejectionBodySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            error: { message: 'Некорректные данные', details: parsed.error.flatten() },
        });
    }

    const emailDate = normalizeIsoDate(parsed.data.email_date)!;

    try {
        const result = insertRejection({
            email_date: emailDate,
            vacancy: parsed.data.vacancy,
            company: parsed.data.company,
            github_url: parsed.data.github_url ?? null,
            note: parsed.data.note ?? null,
        });
        res.json({ data: { inserted: result.inserted, id: result.id } });
    } catch (e) {
        log.error('insert failed:', e);
        res.status(500).json({ error: { message: 'Не удалось сохранить запись' } });
    }
});

apiRouter.post(
    '/analyze-screenshot',
    upload.single('screenshot'),
    asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: { message: 'Файл не загружен' } });
        }

        log.info('sending screenshot to GigaChat Vision...');
        const result = await parseRejectionScreenshot(req.file.buffer, req.file.mimetype);

        if (!result.ok) {
            return res
                .status(502)
                .json({ error: { message: `Не удалось распознать изображение (${result.reason})` } });
        }
        res.json({ data: result.data });
    })
);