type Level = 'debug' | 'info' | 'warn' | 'error';

function log(level: Level, scope: string, ...args: unknown[]): void {
    const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${scope}]`;
    if (level === 'error') console.error(prefix, ...args);
    else if (level === 'warn') console.warn(prefix, ...args);
    else console.log(prefix, ...args);
}

export interface Logger {
    debug: (...a: unknown[]) => void;
    info: (...a: unknown[]) => void;
    warn: (...a: unknown[]) => void;
    error: (...a: unknown[]) => void;
}

export function createLogger(scope: string): Logger {
    return {
        debug: (...a) => log('debug', scope, ...a),
        info: (...a) => log('info', scope, ...a),
        warn: (...a) => log('warn', scope, ...a),
        error: (...a) => log('error', scope, ...a),
    };
}