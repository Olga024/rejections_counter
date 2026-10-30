import 'dotenv/config';
import { createApp } from './app';
import db from './db';
import { createLogger } from './lib/logger';

const log = createLogger('server');
const PORT = Number(process.env.PORT ?? 3001);

const app = createApp();
const server = app.listen(PORT, () => {
    log.info(`API: http://localhost:${PORT}/api/rejections`);
});

function shutdown(signal: string): void {
    log.info(`received ${signal}, shutting down`);
    server.close(() => {
        try {
            db.close();
            log.info('db closed');
        } catch (e) {
            log.error('failed to close db:', e);
        }
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));