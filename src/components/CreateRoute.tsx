"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { apiError } from "@/lib/api-client";

type CityPoint = { id: string; name: string };

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

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
    setDaysOfWeek((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!originId || !destId) {
      setError("Выбери точки отправления и назначения");
      return;
    }
    if (originId === destId) {
      setError("Точки должны отличаться");
      return;
    }
    if (daysOfWeek.length === 0) {
      setError("Выбери хотя бы один день недели");
      return;
    }
    if (seats < 1 || seats > 8) {
      setError("Мест: от 1 до 8");
      return;
    }
    if (price < 1 || price > 50000) {
      setError("Цена: от 1 до 50 000 ₽");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originId,
          destId,
          departureTime,
          daysOfWeek,
          seats,
          price: Math.round(price),
        }),
      });
      const data = (await response.json().catch(() => null)) as { success?: boolean } | null;

      if (!response.ok || !data?.success) {
        setError(apiError(data, "Не получилось создать маршрут").message);
        return;
      }

      setSuccess(true);
      await onSuccess();
      setOriginId("");
      setDestId("");
    } catch {
      setError("Ошибка сети. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-5">
      <div>
        <h2 className="text-h3 mb-1">Новый маршрут</h2>
        <p className="text-frost-dark text-sm">Регулярная поездка — пассажиры найдутся сами</p>
      </div>

      {error && (
        <div className="bg-ember/10 border border-ember/20 rounded-xl p-3 text-ember text-sm" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-birch/10 border border-birch/20 rounded-xl p-3 text-birch-dark text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" strokeWidth={2} aria-hidden="true" />
          <span>Маршрут создан! Рейсы появятся в течение суток.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="origin" className="block text-xs text-frost-dark uppercase tracking-wider font-semibold mb-2">
            Откуда
          </label>
          <select
            id="origin"
            value={originId}
            onChange={(e) => setOriginId(e.target.value)}
            className="select-native"
            required
          >
            <option value="">Точка отправления</option>
            {points.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="dest" className="block text-xs text-frost-dark uppercase tracking-wider font-semibold mb-2">
            Куда
          </label>
          <select
            id="dest"
            value={destId}
            onChange={(e) => setDestId(e.target.value)}
            className="select-native"
            required
          >
            <option value="">Точка назначения</option>
            {points.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="departure" className="block text-xs text-frost-dark uppercase tracking-wider font-semibold mb-2">
          Время отправления
        </label>
        <input
          id="departure"
          type="time"
          value={departureTime}
          onChange={(e) => setDepartureTime(e.target.value)}
          required
          className="input font-utility"
        />
      </div>

      <fieldset>
        <legend className="block text-xs text-frost-dark uppercase tracking-wider font-semibold mb-3">
          Дни недели
        </legend>
        <div className="grid grid-cols-7 gap-1.5">
          {DAY_NAMES.map((name, index) => {
            const day = index + 1;
            const active = daysOfWeek.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                aria-pressed={active}
                className={`py-2.5 rounded-lg text-xs font-semibold transition-all min-h-[44px] ${
                  active
                    ? "bg-river text-white shadow-sm"
                    : "bg-white border border-fog text-frost-dark hover:border-river hover:text-river"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="seats" className="block text-xs text-frost-dark uppercase tracking-wider font-semibold mb-2">
            Мест
          </label>
          <input
            id="seats"
            type="number"
            min={1}
            max={8}
            value={seats}
            onChange={(e) => setSeats(parseInt(e.target.value, 10) || 1)}
            className="input font-utility text-center text-lg font-semibold"
          />
        </div>
        <div>
          <label htmlFor="price" className="block text-xs text-frost-dark uppercase tracking-wider font-semibold mb-2">
            Цена за место (₽)
          </label>
          <input
            id="price"
            type="number"
            min={1}
            max={50000}
            step={10}
            value={price}
            onChange={(e) => setPrice(parseInt(e.target.value, 10) || 0)}
            className="input font-utility text-center text-lg font-semibold"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || points.length === 0}
        aria-busy={loading}
        className="btn-primary w-full py-4 mt-2 text-base"
      >
        {loading ? "Создаём..." : "Создать маршрут"}
      </button>
    </form>
  );
}
