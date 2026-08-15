"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

export default function DriverRegistration({ onSuccess }: { onSuccess: () => void }) {
  const [carModel, setCarModel] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [carColor, setCarColor] = useState("");
  const [customColor, setCustomColor] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const popularColors = ["Белый", "Черный", "Серебристый", "Серый", "Красный", "Синий", "Зеленый", "Желтый", "Коричневый", "Бежевый"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    
    try {
      const finalColor = carColor === "Другой" ? customColor : carColor;
      if (!finalColor) {
        setError("Выбери цвет");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/driver/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carModel, carNumber, carColor: finalColor }),
      });
      const data = await response.json();
      
      if (data.success) {
        setSuccess(true);
        await onSuccess();
      } else {
        setError(data.error || "Ошибка");
      }
    } catch (err) {
      setError("Ошибка: " + (err instanceof Error ? err.message : "неизвестная"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-6 md:p-8 space-y-4 fade-in-up">
      <div className="mb-4">
        <h2 className="font-display text-2xl font-bold mb-1">Регистрация водителя</h2>
        <p className="text-frost text-sm">Начни компенсировать расходы на топливо</p>
      </div>
      
      {error && (
        <div className="bg-ember/10 border border-ember/20 rounded-xl p-3 text-ember text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-birch/10 border border-birch/20 rounded-xl p-3 text-birch text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" strokeWidth={2} aria-hidden="true" />
          <span>Успешно! Теперь создай маршрут.</span>
        </div>
      )}
      
      <div>
        <label className="block text-xs text-frost uppercase tracking-wider font-semibold mb-2">
          Модель авто
        </label>
        <input
          type="text"
          value={carModel}
          onChange={(e) => setCarModel(e.target.value)}
          placeholder="Toyota Camry"
          required
          className="modern-input w-full px-4 py-3.5 text-taiga"
        />
      </div>
      
      <div>
        <label className="block text-xs text-frost uppercase tracking-wider font-semibold mb-2">
          Номер авто
        </label>
        <input
          type="text"
          value={carNumber}
          onChange={(e) => setCarNumber(e.target.value.toUpperCase())}
          placeholder="А123БВ70"
          required
          className="modern-input w-full px-4 py-3.5 text-taiga font-utility tracking-wider"
        />
      </div>
      
      <div>
        <label className="block text-xs text-frost uppercase tracking-wider font-semibold mb-2">
          Цвет авто
        </label>
        <select
          value={carColor}
          onChange={(e) => {
            setCarColor(e.target.value);
            if (e.target.value !== "Другой") setCustomColor("");
          }}
          required
          className="modern-input w-full px-4 py-3.5 text-taiga"
        >
          <option value="">Выбери цвет</option>
          {popularColors.map((color) => (
            <option key={color} value={color}>{color}</option>
          ))}
          <option value="Другой">Другой цвет...</option>
        </select>
        
        {carColor === "Другой" && (
          <input
            type="text"
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            placeholder="Введи свой цвет"
            required
            className="modern-input w-full px-4 py-3.5 text-taiga mt-2"
          />
        )}
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full text-white font-semibold py-4 rounded-xl mt-6 disabled:opacity-50 text-base"
      >
        {loading ? "Регистрируем..." : "Стать водителем"}
      </button>
    </form>
  );
}
