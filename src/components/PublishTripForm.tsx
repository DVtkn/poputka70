"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import StopCombobox, { type StopSelection } from "@/components/StopCombobox";
import { apiError } from "@/lib/api-client";

type Repeat = "none" | "weekdays" | "weekends" | "daily";

const REPEAT_OPTIONS: Array<{ value: Repeat; label: string }> = [
  { value: "none", label: "Только этот раз" },
  { value: "weekdays", label: "По будням" },
  { value: "weekends", label: "По выходным" },
  { value: "daily", label: "Каждый день" },
];

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function tomorrowISO(): string {
  const now = new Date();
  return toISO(new Date(now.getTime() + 24 * 60 * 60 * 1000));
}

export default function PublishTripForm({ onPublished }: { onPublished?: () => void }) {
  const router = useRouter();
  const [originName, setOriginName] = useState("");
  const [origin, setOrigin] = useState<StopSelection | null>(null);
  const [destName, setDestName] = useState("");
  const [dest, setDest] = useState<StopSelection | null>(null);
  const [date, setDate] = useState(tomorrowISO());
  const [time, setTime] = useState("08:00");
  const [seats, setSeats] = useState(2);
  const [price, setPrice] = useState(100);
  const [comment, setComment] = useState("");
  const [repeat, setRepeat] = useState<Repeat>("none");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (!origin || !dest) {
      setError("Выбери точки из подсказок — так пассажиры найдут твою поездку");
      return;
    }
    if (origin.name === dest.name) {
      setError("Точка отправления и назначения должны отличаться");
      return;
    }
    if (date < toISO(new Date())) {
      setError("Дата уже прошла — выбери сегодня или позже");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin,
          dest,
          date,
          time,
          seats,
          price: Math.round(price),
          comment: comment.trim(),
          repeat,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { success?: boolean; created?: number; firstTripId?: string | null }
        | null;

      if (!res.ok || !data?.success) {
        setError(apiError(data, "Не получилось опубликовать поездку").message);
        return;
      }

      if (data?.firstTripId) {
        router.push(`/trips/${data.firstTripId}`);
        router.refresh();
        return;
      }

      setSuccess(true);
      onPublished?.();
    } catch {
      setError("Ошибка сети. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6 items-start">
    <form onSubmit={submit} className="card p-5 md:p-6 space-y-5">
      <div>
        <h2 className="text-h3 mb-1">Детали поездки</h2>
        <p className="text-frost-dark text-sm">
          Полминуты — и попутка в ленте. Пассажиры попросят место, ты решишь, кого взять.
        </p>
      </div>

      {error && (
        <div className="bg-ember/10 border border-ember/20 rounded-xl p-3 text-ember text-sm" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-birch/10 border border-birch/20 rounded-xl p-3 text-birch-dark text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" strokeWidth={2} aria-hidden="true" />
          <span>
            Поездка в ленте. <Link href="/profile/trips" className="underline">Смотреть заявки</Link>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StopCombobox
          id="ride-origin"
          label="Откуда"
          value={originName}
          onChange={(value) => {
            setOriginName(value);
            setOrigin(null);
          }}
          onSelect={(selection) => {
            setOriginName(selection.name);
            setOrigin(selection);
          }}
          placeholder="Например, Каштак"
        />
        <StopCombobox
          id="ride-dest"
          label="Куда"
          value={destName}
          onChange={(value) => {
            setDestName(value);
            setDest(null);
          }}
          onSelect={(selection) => {
            setDestName(selection.name);
            setDest(selection);
          }}
          placeholder="Например, Площадь Ленина"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label htmlFor="ride-date" className="block text-xs text-frost-dark uppercase tracking-wider font-semibold mb-2">
            Дата
          </label>
          <input
            id="ride-date"
            type="date"
            min={toISO(new Date())}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="input font-utility"
            required
          />
        </div>
        <div>
          <label htmlFor="ride-time" className="block text-xs text-frost-dark uppercase tracking-wider font-semibold mb-2">
            Выезд
          </label>
          <input
            id="ride-time"
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="input font-utility"
            required
          />
        </div>
        <div>
          <label htmlFor="ride-seats" className="block text-xs text-frost-dark uppercase tracking-wider font-semibold mb-2">
            Свободно мест
          </label>
          <input
            id="ride-seats"
            type="number"
            min={1}
            max={6}
            value={seats}
            onChange={(event) => setSeats(Math.max(1, Math.min(6, Number(event.target.value) || 1)))}
            className="input font-utility text-center font-semibold"
          />
        </div>
        <div>
          <label htmlFor="ride-price" className="block text-xs text-frost-dark uppercase tracking-wider font-semibold mb-2">
            Цена места, ₽
          </label>
          <input
            id="ride-price"
            type="number"
            min={0}
            max={50000}
            step={10}
            value={price}
            onChange={(event) => setPrice(Math.max(0, Number(event.target.value) || 0))}
            className="input font-utility text-center font-semibold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="ride-repeat" className="block text-xs text-frost-dark uppercase tracking-wider font-semibold mb-2">
            Повтор
          </label>
          <select
            id="ride-repeat"
            value={repeat}
            onChange={(event) => setRepeat(event.target.value as Repeat)}
            className="select-native"
          >
            {REPEAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ride-comment" className="block text-xs text-frost-dark uppercase tracking-wider font-semibold mb-2">
            Заметка (необязательно)
          </label>
          <input
            id="ride-comment"
            type="text"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={300}
            placeholder="Например: еду без остановок, в машине тепло"
            className="input"
          />
        </div>
      </div>

      <button type="submit" disabled={loading} aria-busy={loading} className="btn-primary w-full py-4 text-base min-h-[56px]">
        {loading ? "Публикуем…" : "Опубликовать поездку"}
      </button>

      <p className="text-xs text-frost-dark text-center lg:text-left">
        Цена — компенсация бензина. Попутка70 бесплатна: пассажиры платят напрямую.
      </p>
    </form>

    <aside className="hidden lg:block space-y-3">
      <div className="card p-5">
        <div className="text-caption mb-3">Что увидят пассажиры</div>
        <div className="font-utility text-2xl font-bold mb-1">{time || "08:00"}</div>
        <div className="text-sm text-taiga font-medium">
          {originName || "Откуда"} → {destName || "Куда"}
        </div>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-fog">
          <span className="text-sm text-frost-dark">свободно мест</span>
          <span className="font-utility font-bold">{seats}</span>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-sm text-frost-dark">цена места</span>
          <span className="font-utility font-bold">{price} ₽</span>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-sm text-frost-dark">повтор</span>
          <span className="text-sm font-medium">
            {REPEAT_OPTIONS.find((option) => option.value === repeat)?.label}
          </span>
        </div>
      </div>

      <div className="card p-5">
        <div className="text-caption mb-2">Совет</div>
        <p className="text-sm text-frost-dark leading-relaxed">
          Ставь цену на уровне бензина: 80–150 ₽ по городу. Заявка приходит к тебе, ты сам решаешь,
          кого взять, и можешь отменить поездку в любой момент.
        </p>
      </div>
    </aside>
    </div>
  );
}
