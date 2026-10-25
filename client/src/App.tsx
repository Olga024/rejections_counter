import { useEffect, useState } from 'react';
import type { Rejection } from './types'

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

  if (loading) return <div className="p-8">Загрузка...</div>;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl mb-6">Отказы HeadHunter</h1>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-cream/30">
            <th className="py-2">Дата</th>
            <th className="py-2">Вакансия</th>
            <th className="py-2">Компания</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i} className="border-b border-cream/10">
              <td className="py-2">{r.email_date}</td>
              <td className="py-2">{r.vacancy}</td>
              <td className="py-2">{r.company}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}