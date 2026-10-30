import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api';
import { createLogger } from './lib/logger';

const log = createLogger('app');

export function createApp() {
    const app = express();
    app.use(cors());
    app.use(express.json({ limit: '1mb' }));

    app.use('/api', apiRouter);

    app.get('/api/health', (_req, res) => res.json({ data: { ok: true } }));

    app.use((_req: Request, res: Response) => {
        res.status(404).json({ error: { message: 'Not Found' } });
    });

    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
        log.error('unhandled error:', err);
        if (res.headersSent) return;
        res.status(500).json({ error: { message: 'Internal Server Error' } });
    });

    return app;
}