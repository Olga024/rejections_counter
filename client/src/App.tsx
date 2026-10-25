import { useEffect, useState } from 'react';
import type { Rejection } from './types';

export default function App() {
    const [data, setData] = useState<Rejection[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/rejections')
            .then((r) => r.json())
            .then((rows) => {
                setData(rows);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-midnight text-frost flex items-center justify-center font-serif">
                Загрузка...
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-midnight text-frost font-serif overflow-hidden selection:bg-indigo-400/30 selection:text-frost">
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] max-w-800px] max-h[800px] rounded-full bg-indigo-500/15 blur-[130px] mix-blend-screen animate-[float_14s_ease-in-out_infinite]" />
                <div className="absolute top-[20%] right-[-10%] w-[50vw] h-[50vw] max-w-600px] max-h-600px] rounded-full bg-teal-500/15 blur-[130px] mix-blend-screen animate-[float_17s_ease-in-out_infinite_reverse]" />
                <div className="absolute bottom-[-20%] left-[20%] w-[50vw] h-[50vw] max-w-600px] max-h-600px] rounded-full bg-violet-500/15 blur-[130px] mix-blend-screen animate-[float_20s_ease-in-out_infinite]" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto p-8 md:p-12">
                <header className="mb-12 border-b border-slate-border/40 pb-6">
                    <h1 className="text-3xl md:text-4xl tracking-tight">
                        Отказы HeadHunter
                    </h1>
                    <p className="text-frost/50 mt-2 text-sm">
                        Всего: {data.length}
                    </p>
                </header>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-border/60 text-sm tracking-widest uppercase text-frost/50">
                                <th className="py-4 pr-4 font-normal">Дата</th>
                                <th className="py-4 px-4 font-normal">Вакансия</th>
                                <th className="py-4 pl-4 font-normal">Компания</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((r, i) => (
                                <tr
                                    key={i}
                                    className="border-b border-slate-border/30 hover:bg-frost/5 transition-colors duration-200 group"
                                >
                                    <td className="py-4 pr-4 text-sm text-frost/60 whitespace-nowrap">
                                        {r.email_date}
                                    </td>
                                    <td className="py-4 px-4 text-base group-hover:text-white transition-colors">
                                        {r.vacancy}
                                    </td>
                                    <td className="py-4 pl-4 text-base text-frost/80 group-hover:text-white transition-colors">
                                        {r.company}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}