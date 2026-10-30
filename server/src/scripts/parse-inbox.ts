import 'dotenv/config';
import db from '../db';
import { parseRejectionsFromInbox } from '../services/imap';
import { createLogger } from '../lib/logger';

const log = createLogger('parse-inbox');

(async () => {
    try {
        await parseRejectionsFromInbox();
    } catch (e) {
        log.error('parse failed:', e);
        process.exitCode = 1;
    } finally {
        db.close();
    }
})();