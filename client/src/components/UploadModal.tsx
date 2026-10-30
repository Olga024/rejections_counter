import { useState, useRef, useEffect } from 'react';
import type { Rejection } from '../types';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Rejection) => void;
}

export default function UploadModal({ isOpen, onClose, onSave }: UploadModalProps) {
    const [image, setImage] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);

    const [formData, setFormData] = useState<Rejection>({
        email_date: '',
        vacancy: '',
        company: '',
        github_url: '',
        note: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    if (!isOpen) return null;

    const handleFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        analyzeScreenshot(file);
    };

    const analyzeScreenshot = async (file: File) => {
        setIsScanning(true);

        const form = new FormData();
        form.append('screenshot', file);

        try {
            const response = await fetch('/api/analyze-screenshot', {
                method: 'POST',
                body: form,
            });

            const json = (await response.json()) as {
                data?: { vacancy: string; company: string; date: string | null };
                error?: { message: string };
            };

            if (!response.ok || !json.data) {
                throw new Error(json.error?.message ?? 'Не удалось распознать изображение');
            }

            const payload = json.data;

            setFormData(prev => ({
                ...prev,
                vacancy: payload.vacancy || '',
                company: payload.company || '',
                // Сервер отдаёт дату в ISO (YYYY-MM-DD) — это ровно формат input[type=date]
                email_date: payload.date || '',
            }));
        } catch (error) {
            console.error('Ошибка распознавания:', error);
            alert('Не удалось распознать скриншот. Пожалуйста, заполните данные вручную.');
        } finally {
            setIsScanning(false);
        }
    };

    const handleRemoveImage = () => {

        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setIsScanning(false);
        setImage(null);

        setFormData(prev => ({
            ...prev,
            vacancy: '',
            company: '',
            email_date: ''
        }));

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        handleRemoveImage();
        setFormData({ email_date: '', vacancy: '', company: '', github_url: '', note: '' });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-midnight/80 backdrop-blur-md transition-opacity">
            <div className="relative w-full max-w-4xl bg-midnight border border-slate-border/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-[modal-appear_0.3s_ease-out]">

                {/* Кнопка закрытия модалки */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 text-frost/50 hover:text-frost transition-colors text-2xl"
                >
                    ×
                </button>

                {/* Левая часть: Изображение и Сканер */}
                <div className="w-full md:w-1/2 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-border/30 bg-black/20 min-h-75">
                    {!image ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
                            }}
                            className="w-full h-full border-2 border-dashed border-slate-border/50 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400/50 hover:bg-indigo-500/5 transition-all group"
                        >
                            <svg className="w-12 h-12 text-slate-border group-hover:text-indigo-400 mb-4 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-frost/60 text-center px-4">Перетащите скриншот сюда<br />или нажмите для выбора</span>
                        </div>
                    ) : (
                        <div className="relative w-full max-h-100 flex flex-col items-center">
                            <div className="relative overflow-hidden rounded-xl border border-slate-border/50 w-full flex justify-center bg-black/40">
                                <img src={image} alt="Upload" className="max-h-87.5 w-auto object-contain" />

                                {/* Анимация сканирования */}
                                {isScanning && (
                                    <>
                                        <div className="absolute inset-0 bg-indigo-500/10 pointer-events-none" />
                                        <div className="absolute w-full h-1 bg-indigo-400 shadow-[0_0_20px_4px_rgba(129,140,248,0.7)] animate-[scan_2s_linear_infinite]" style={{ top: '0%' }} />
                                    </>
                                )}
                            </div>

                            {/* Кнопка удаления скриншота */}
                            {!isScanning && (
                                <button
                                    type="button"
                                    onClick={handleRemoveImage}
                                    className="mt-4 text-sm text-red-400/70 hover:text-red-400 transition-colors flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-400/10"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Удалить фото
                                </button>
                            )}
                        </div>
                    )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                </div>

                {/* Правая часть: Форма */}
                <div className="w-full md:w-1/2 p-8 flex flex-col relative z-10">
                    <h2 className="text-2xl font-serif text-frost mb-6">Данные об отказе</h2>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 grow">
                        <div>
                            <label className="block text-sm text-frost/60 mb-1">Дата отказа</label>
                            <input
                                type="date"
                                required
                                value={formData.email_date}
                                onChange={(e) => setFormData({ ...formData, email_date: e.target.value })}
                                className="w-full bg-midnight border border-slate-border/50 rounded-lg p-3 text-frost focus:outline-none focus:border-indigo-400 transition-colors scheme-dark"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-frost/60 mb-1">Компания</label>
                            <input
                                type="text"
                                required
                                placeholder="Например: Сбербанк"
                                value={formData.company}
                                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                className="w-full bg-midnight border border-slate-border/50 rounded-lg p-3 text-frost focus:outline-none focus:border-indigo-400 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-frost/60 mb-1">Вакансия</label>
                            <input
                                type="text"
                                required
                                placeholder="Frontend-разработчик"
                                value={formData.vacancy}
                                onChange={(e) => setFormData({ ...formData, vacancy: e.target.value })}
                                className="w-full bg-midnight border border-slate-border/50 rounded-lg p-3 text-frost focus:outline-none focus:border-indigo-400 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-frost/60 mb-1">Ссылка на GitHub (опционально)</label>
                            <input
                                type="url"
                                placeholder="https://github.com/..."
                                value={formData.github_url || ''}
                                onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                                className="w-full bg-midnight border border-slate-border/50 rounded-lg p-3 text-frost focus:outline-none focus:border-indigo-400 transition-colors"
                            />
                        </div>

                        <div className="grow">
                            <label className="block text-sm text-frost/60 mb-1">Заметка для рефлексии</label>
                            <textarea
                                placeholder="Что я вынес из этого отказа?"
                                value={formData.note || ''}
                                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                className="w-full bg-midnight border border-slate-border/50 rounded-lg p-3 text-frost focus:outline-none focus:border-indigo-400 transition-colors resize-none h-24"
                            />
                        </div>

                        <div className="mt-4 flex gap-4">
                            <button
                                type="submit"
                                disabled={isScanning}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)]"
                            >
                                {isScanning ? 'Сканирование...' : 'Сохранить'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-3 border border-slate-border/50 text-frost hover:bg-frost/5 rounded-lg transition-colors"
                            >
                                Отмена
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}