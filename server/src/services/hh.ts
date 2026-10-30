import { createLogger } from '../lib/logger';

const log = createLogger('hh');

export async function fetchCompanyFromHH(vacancyUrl: string): Promise<string | null> {
    try {
        const match = vacancyUrl.match(/\/vacancy\/(\d+)/);
        if (!match) return null;

        const res = await fetch(`https://api.hh.ru/vacancies/${match[1]}`, {
            headers: { 'User-Agent': 'hh-reject-parser/1.0 (olgasvitina@rambler.ru)' },
        });
        if (!res.ok) return null;

        const data = (await res.json()) as { employer?: { name?: string } };
        return data.employer?.name ?? null;
    } catch (e) {
        log.warn('HH API request failed:', e);
        return null;
    }
}