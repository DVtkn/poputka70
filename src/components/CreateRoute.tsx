"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

type CityPoint = { id: string; name: string };

export default function CreateRoute({ points, onSuccess }: { points: CityPoint[]; onSuccess: () => void }) {
  const [originId, setOriginId] = useState("");
  const [destId, setDestId] = useState("");
  const [departureTime, setDepartureTime] = useState("08:00");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState(150);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) => 
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      if (!originId || !destId) {
        setError("Выбери точки");
        setLoading(false);
        return;
      }
      if (originId === destId) {
        setError("Точки должны отличаться");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originId, destId, departureTime, daysOfWeek, seats, price }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
        await onSuccess();
        setOriginId("");
        setDestId("");
      } else {
        setError(data.error || "Ошибка");
      }
    } catch (err) {
      setError("Ошибка: " + (err instanceof Error ? err.message : "неизвестная"));
    } finally {
      setLoading(false);
    }
  };

  const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-6 md:p-8 space-y-4 fade-in-up">
      <div className="mb-4">
        <h2 className="font-display text-2xl font-bold mb-1">Новый маршрут</h2>
        <p className="text-frost text-sm">Создай регулярную поездку</p>
      </div>
      
      {error && (
        <div className="bg-ember/10 border border-ember/20 rounded-xl p-3 text-ember text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-birch/10 border border-birch/20 rounded-xl p-3 text-birch text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" strokeWidth={2} aria-hidden="true" />
          <span>Маршрут создан! Ближайшие поездки будут доступны для бронирования в ближайшее время.</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-frost uppercase tracking-wider font-semibold mb-2">
            Откуда
          </label>
          <select
            value={originId}
            onChange={(e) => setOriginId(e.target.value)}
            required
            className="modern-input w-full px-4 py-3.5 text-taiga"
          >
            <option value="">Точка отправления</option>
            {points.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-xs text-frost uppercase tracking-wider font-semibold mb-2">
            Куда
          </label>
          <select
            value={destId}
            onChange={(e) => setDestId(e.target.value)}
            required
            className="modern-input w-full px-4 py-3.5 text-taiga"
          >
            <option value="">Точка назначения</option>
            {points.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-xs text-frost uppercase tracking-wider font-semibold mb-2">
          Время отправления
        </label>
        <input
          type="time"
          value={departureTime}
          onChange={(e) => setDepartureTime(e.target.value)}
          required
          className="modern-input w-full px-4 py-3.5 text-taiga font-utility"
        />
      </div>
      
      <div>
        <label className="block text-xs text-frost uppercase tracking-wider font-semibold mb-3">
          Дни недели
        </label>
        <div className="grid grid-cols-7 gap-1.5">
          {dayNames.map((name, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => toggleDay(idx + 1)}
              className={`py-2.5 rounded-lg text-xs font-semibold transition-all ${
                daysOfWeek.includes(idx + 1) 
                  ? "btn-primary text-white shadow-sm" 
                  : "bg-white border border-fog text-frost hover:border-river hover:text-river"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-frost uppercase tracking-wider font-semibold mb-2">
            Мест
          </label>
          <input
            type="number"
            min="1"
            max="7"
            value={seats}
            onChange={(e) => setSeats(parseInt(e.target.value) || 3)}
            className="modern-input w-full px-4 py-3.5 text-taiga font-utility text-center text-lg font-semibold"
          />
        </div>
        <div>
          <label className="block text-xs text-frost uppercase tracking-wider font-semibold mb-2">
            Цена (₽)
          </label>
          <input
            type="number"
            min="50"
            step="10"
            value={price}
            onChange={(e) => setPrice(parseInt(e.target.value) || 150)}
            className="modern-input w-full px-4 py-3.5 text-taiga font-utility text-center text-lg font-semibold"
          />
        </div>
      </div>
      
      <button
        type="submit"
        disabled={loading || points.length === 0}
        className="btn-primary w-full text-white font-semibold py-4 rounded-xl mt-4 disabled:opacity-50 text-base"
      >
        {loading ? "Создаём..." : "Создать маршрут"}
      </button>
    </form>
  );
}
