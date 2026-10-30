import type { Rejection } from "../types";

export const getList = async (): Promise<Rejection[]> => {
    const res = await fetch('/api/rejections');
    if (!res.ok) {
        throw new Error(`GET /api/rejections failed: ${res.status}`);
    }
    const json = (await res.json()) as { data: Rejection[] };
    return json.data;
};