import type { Rejection } from "../types";

export const getList = () => new Promise<Rejection[]>((resolve, reject) => {
    fetch('/api/rejections')
        .then((r) => r.json())
        .then(resolve)
        .catch(reject);
});