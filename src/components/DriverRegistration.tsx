"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { apiError } from "@/lib/api-client";

const POPULAR_COLORS = [
  "Белый", "Чёрный", "Серебристый", "Серый", "Красный",
  "Синий", "Зелёный", "Жёлтый", "Коричневый", "Бежевый",
];

export default function DriverRegistration({ onSuccess }: { onSuccess: () => void }) {
  const [carModel, setCarModel] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [carColor, setCarColor] = useState("");
  const [customColor, setCustomColor] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const finalColor = carColor === "Другой" ? customColor.trim() : carColor;
    if (!carModel.trim() || !carNumber.trim()) {
      setError("Заполни модель и номер авто");
      return;
    }
    if (!finalColor) {
      setError("Выбери цвет авто");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/driver/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carModel: carModel.trim(), carNumber: carNumber.trim(), carColor: finalColor }),
      });
      const data = (await response.json().catch(() => null)) as { success?: boolean } | null;

      if (!response.ok || !data?.success) {
        setError(apiError(data, "Не получилось зарегистрироваться").message);
        return;
      }

      setSuccess(true);
      await onSuccess();
    } catch {
      setError("Ошибка сети. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-5">
      <div>
        <h2 className="text-h3 mb-1">Регистрация водителя</h2>
        <p className="text-frost-dark text-sm">Начни компенсировать расходы на дорогу</p>
      </div>

      {error && (
        <div className="bg-ember/10 border border-ember/20 rounded-xl p-3 text-ember text-sm" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-birch/10 border border-birch/20 rounded-xl p-3 text-birch-dark text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" strokeWidth={2} aria-hidden="true" />
          <span>Готово! Теперь создай свой первый маршрут ниже.</span>
        </div>
      )}

      <div>
        <label htmlFor="carModel" className="block text-xs text-frost-dark uppercase tracking-wider font-semibold mb-2">
          Модель авто
        </label>
        <input
          id="carModel"
          type="text"
          value={carModel}
          onChange={(e) => setCarModel(e.target.value)}
          placeholder="Toyota Camry"
          required
          maxLength={60}
          className="input"
        />
      </div>

      <div>
        <label htmlFor="carNumber" className="block text-xs text-frost-dark uppercase tracking-wider font-semibold mb-2">
          Номер авто
        </label>
        <input
          id="carNumber"
          type="text"
          value={carNumber}
          onChange={(e) => setCarNumber(e.target.value.toUpperCase())}
          placeholder="А123БВ70"
          required
          maxLength={16}
          className="input font-utility tracking-wider"
        />
      </div>

      <div>
        <label htmlFor="carColor" className="block text-xs text-frost-dark uppercase tracking-wider font-semibold mb-2">
          Цвет авто
        </label>
        <select
          id="carColor"
          value={carColor}
          onChange={(e) => {
            setCarColor(e.target.value);
            if (e.target.value !== "Другой") setCustomColor("");
          }}
          required
          className="select-native"
        >
          <option value="">Выбери цвет</option>
          {POPULAR_COLORS.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
          <option value="Другой">Другой цвет…</option>
        </select>

        {carColor === "Другой" && (
          <input
            type="text"
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            placeholder="Введи свой цвет"
            required
            maxLength={40}
            className="input mt-3"
          />
        )}
      </div>

      <button type="submit" disabled={loading} aria-busy={loading} className="btn-primary w-full py-4 mt-2 text-base">
        {loading ? "Регистрируем..." : "Стать водителем"}
      </button>
    </form>
  );
}
