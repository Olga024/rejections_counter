import GigaChat from 'gigachat';
import { Agent } from 'node:https';
import dotenv from 'dotenv';
import sharp from 'sharp';

dotenv.config();

const httpsAgent = new Agent({
    rejectUnauthorized: false,
});

const client = new GigaChat({
    timeout: 600,
    model: 'GigaChat-2-Max',
    credentials: process.env.GIGACHAT_CREDENTIALS!,
    scope: process.env.GIGACHAT_SCOPE || 'GIGACHAT_API_PERS',
    httpsAgent: httpsAgent,
});

export interface ParsedRejection {
    vacancy: string;
    company: string;
    date: string | null;
}

export async function parseRejectionScreenshot(imageBuffer: Buffer, mimeType: string): Promise<ParsedRejection> {
    const jpegBuffer = await sharp(imageBuffer).jpeg({ quality: 90 }).toBuffer();

    const file = new File([new Uint8Array(jpegBuffer)], 'screenshot.jpg', { type: 'image/jpeg' });

    const uploadedFile = await client.uploadFile(file);

    const prompt = `
        Ты — эксперт по парсингу данных. На изображении — скриншот письма или страницы с отказом в приеме на работу.
        Извлеки из него информацию и верни СТРОГО валидный JSON без каких-либо пояснений, markdown-разметки или лишнего текста.
        Формат JSON:
        {
            "vacancy": "название должности/вакансии",
            "company": "название компании",
            "date": "дата отказа в формате YYYY-MM-DD (если есть полная дата, иначе null)"
        }
        Если какое-то поле не найдено, оставь пустую строку или null.
    `;

    const response = await client.chat({
        messages: [
            {
                role: 'user',
                content: prompt,
                attachments: [uploadedFile.id],
            }
        ],
        temperature: 0.1,
    });

    const content = response.choices[0]?.message.content || '';

    console.log(content);

    try {
        const cleanedContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedContent);

        return {
            vacancy: parsed.vacancy || '',
            company: parsed.company || '',
            date: parsed.date || null
        };
    } catch (e) {
        console.error('Не удалось распарсить ответ от AI:', content);
        return { vacancy: '', company: '', date: null };
    }
}