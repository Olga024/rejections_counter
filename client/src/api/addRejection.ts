import type { Rejection } from "../types";

interface InsertResponse {
    data: { inserted: boolean; id: number | null };
    error?: { message: string };
}

export const addRejection = async (rejectionData: Rejection): Promise<boolean> => {
    const res = await fetch('/api/rejections', {
        method: 'POST',
        body: JSON.stringify(rejectionData),
        headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
        let message = `POST /api/rejections failed: ${res.status}`;
        try {
            const body = (await res.json()) as InsertResponse;
            if (body?.error?.message) message = body.error.message;
        } catch {
        }
        throw new Error(message);
    }

    const json = (await res.json()) as InsertResponse;
    return json.data.inserted;
};