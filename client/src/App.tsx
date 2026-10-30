import { useCallback, useEffect, useState } from 'react';
import type { Rejection } from './types';
import UploadModal from './components/UploadModal';
import { getList } from './api/getList';
import { addRejection } from './api/addRejection';

export default function App() {
    const [data, setData] = useState<Rejection[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const loadData = useCallback(() => {
        getList()
            .then((rows) => { setData(rows); })
            .catch((error) => { console.error(error); })
            .finally(() => { setLoading(false); });
    }, [setLoading, setData]);

    const handleSave = useCallback((newRejection: Rejection) => {
        setData([newRejection, ...data]);

        // send new data to backend here
        addRejection(newRejection)
            .catch((error) => { console.error(error); })
            .finally(() => { loadData(); });
    }, [loadData]);

    useEffect(() => {
        loadData();
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
            {/* --- Фон (Mesh Gradient) --- */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] max-w-200 max-h-200 rounded-full bg-indigo-500/15 blur-[130px] mix-blend-screen animate-[float_14s_ease-in-out_infinite]" />
                <div className="absolute top-[20%] right-[-10%] w-[50vw] h-[50vw] max-w-150 max-h-150 rounded-full bg-teal-500/15 blur-[130px] mix-blend-screen animate-[float_17s_ease-in-out_infinite_reverse]" />
                <div className="absolute bottom-[-20%] left-[20%] w-[50vw] h-[50vw] max-w-150 max-h-150 rounded-full bg-violet-500/15 blur-[130px] mix-blend-screen animate-[float_20s_ease-in-out_infinite]" />
            </div>

            {/* --- Контент --- */}
            <div className="relative z-10 max-w-6xl mx-auto p-8 md:p-12">
                <header className="mb-12 border-b border-slate-border/40 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl tracking-tight">
                            Отказы
                        </h1>
                        <p className="text-frost/50 mt-2 text-sm">
                            Всего: {data.length} | Коллекция опыта
                        </p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-full font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.6)] flex items-center gap-2"
                    >
                        <span>+</span> Добавить отказ
                    </button>
                </header>

                {/* Сетка карточек */}
                {data.length === 0 ? (
                    <div className="text-center text-frost/50 py-20">
                        Пока нет добавленных отказов. Нажмите «Добавить отказ», чтобы загрузить скриншот.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {data.map((r, i) => (
                            <div
                                key={i}
                                className="group relative bg-midnight/40 backdrop-blur-md border border-slate-border/50 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:bg-midnight/60 flex flex-col"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-xs font-mono text-frost/50 bg-frost/5 px-2 py-1 rounded">
                                        {r.email_date}
                                    </span>
                                    {r.github_url && (
                                        <a href={r.github_url} target="_blank" rel="noreferrer" className="text-frost/40 hover:text-indigo-400 transition-colors" title="Ссылка на GitHub">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
                                        </a>
                                    )}
                                </div>

                                <h3 className="text-lg text-frost mb-2 leading-tight group-hover:text-indigo-300 transition-colors">
                                    {r.vacancy}
                                </h3>
                                <p className="text-sm text-frost/70 mb-4">
                                    {r.company}
                                </p>

                                {r.note && (
                                    <div className="mt-auto pt-4 border-t border-slate-border/30">
                                        <p className="text-xs text-frost/50 italic line-clamp-3">
                                            "{r.note}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Модалка */}
            <UploadModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
            />
        </div>
    );
}