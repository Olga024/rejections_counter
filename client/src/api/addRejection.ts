import type { Rejection } from "../types";

export const addRejection = (rejectionData: Rejection) => new Promise<boolean>((resolve, reject) => {
    fetch('/api/rejections', {
        method: "POST",
        body: JSON.stringify(rejectionData),
        headers: {
            "Content-Type": "application/json",
        },
    })
        .then(() => resolve(true))
        .catch(reject);
});