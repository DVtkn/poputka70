"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Search, ArrowUpDown, MapPin, LocateFixed } from "lucide-react";
import StopCombobox from "@/components/StopCombobox";
import { approxDistanceKm } from "@/lib/geo";

const POPULAR_ROUTES = [
  { from: "Южные Ворота", to: "ТГУ" },
  { from: "Каштак", to: "Площадь Ленина" },
  { from: "Зелёные Горки", to: "ТПУ" },
  { from: "Аэропорт", to: "Ж/Д вокзал Томск-1" },
];

function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tomsk" }).format(new Date());
}

function tomorrowISO(): string {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tomsk" }).format(tomorrow);
}

export default function SearchForm({
  onSearchSubmitted,
}: {
  onSearchSubmitted?: () => void;
} = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");
  const [date, setDate] = useState(searchParams.get("date") || "");
  const [passengers, setPassengers] = useState(searchParams.get("passengers") || "1");
  const [locating, setLocating] = useState(false);
  const [locateNotice, setLocateNotice] = useState("");

  const isFormValid = Boolean(from && to && from !== to);

  const handleFindNearest = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocateNotice("Геолокация не поддерживается вашим браузером");
      return;
    }
    setLocating(true);
    setLocateNotice("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch("/api/stops?limit=100");
          const data = (await res.json()) as { success?: boolean; stops?: Array<{ name: string; lat: number; lng: number }> };
          if (data?.stops && data.stops.length > 0) {
            let closest = data.stops[0];
            let minDist = Infinity;
            for (const s of data.stops) {
              const d = approxDistanceKm(latitude, longitude, s.lat, s.lng);
              if (d < minDist) {
                minDist = d;
                closest = s;
              }
            }
            if (closest) {
              setFrom(closest.name);
              setLocateNotice(`Выбрана ближайшая: ${closest.name}`);
              setTimeout(() => setLocateNotice(""), 4000);
            }
          }
        } catch {
          setLocateNotice("Не удалось загрузить остановки");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setLocateNotice(err.code === 1 ? "Доступ к геопозиции отклонён" : "Не удалось определить координаты");
        setTimeout(() => setLocateNotice(""), 4000);
      },
      { timeout: 8000 }
    );
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isFormValid) return;

    const params = new URLSearchParams();
    params.set("from", from);
    params.set("to", to);
    if (date) params.set("date", date);
    if (passengers !== "1") params.set("passengers", passengers);

    router.push(`/search?${params.toString()}`);
    onSearchSubmitted?.();
  };

  const swapLocations = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" role="search" aria-label="Поиск попутки" noValidate>
      {/* Пометка для выбора ближайшей остановки */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-river/10 border border-river/20 text-taiga text-xs leading-relaxed">
        <span className="text-base select-none leading-none mt-0.5" aria-hidden="true">💡</span>
        <div>
          <span className="font-semibold text-river">Совет пассажиру:</span> выбирай остановку, <b>наиболее близкую к себе</b> — водители едут по коридору через весь город и подберут тебя по пути следования.
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_44px_1fr] gap-2 sm:gap-3 items-end relative">
        <div>
          <StopCombobox
            id="from"
            label="Откуда"
            labelRight={
              <button
                type="button"
                onClick={handleFindNearest}
                disabled={locating}
                className="text-[11px] text-river hover:text-river-dark flex items-center gap-1 font-medium transition-colors"
                title="Найти ближайшую остановку по геопозиции"
              >
                <LocateFixed className={`w-3 h-3 ${locating ? "animate-spin" : ""}`} />
                {locating ? "Ищу..." : "Рядом со мной"}
              </button>
            }
            value={from}
            onChange={setFrom}
            onSelect={() => {
              if (!to) {
                setTimeout(() => {
                  document.getElementById("to")?.focus();
                }, 50);
              }
            }}
            placeholder="Начни вводить остановку"
          />
          {locateNotice && (
            <p className="text-[11px] text-river mt-1 animate-fade-in">{locateNotice}</p>
          )}
        </div>

        {/* Мобильная кнопка смены направления */}
        <div className="flex sm:hidden justify-center -my-2 relative z-10">
          <button
            type="button"
            onClick={swapLocations}
            className="w-8 h-8 rounded-full bg-white border border-fog text-frost hover:text-river shadow-xs active:scale-95 transition-all flex items-center justify-center"
            aria-label="Поменять местами"
          >
            <ArrowUpDown className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        {/* Десктопная кнопка смены направления */}
        <button
          type="button"
          onClick={swapLocations}
          className="swap-btn hidden sm:flex mb-0.5"
          aria-label="Поменять местами"
        >
          <ArrowUpDown className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
        </button>

        <div>
          <StopCombobox id="to" label="Куда" value={to} onChange={setTo} placeholder="Куда едем?" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-[11rem_8rem_auto] gap-2.5 sm:gap-3 items-end">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="date" className="block text-xs font-medium text-frost-dark">
              Дата
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDate(date === todayISO() ? "" : todayISO())}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                  date === todayISO()
                    ? "bg-river text-white border-river"
                    : "bg-white text-frost-dark border-fog hover:text-river"
                }`}
              >
                Сегодня
              </button>
              <button
                type="button"
                onClick={() => setDate(date === tomorrowISO() ? "" : tomorrowISO())}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                  date === tomorrowISO()
                    ? "bg-river text-white border-river"
                    : "bg-white text-frost-dark border-fog hover:text-river"
                }`}
              >
                Завтра
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-frost pointer-events-none">
              <Calendar className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <input
              id="date"
              type="date"
              min={todayISO()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="input pl-9 text-sm font-utility"
              aria-label="Дата поездки"
            />
          </div>
        </div>

        <div>
          <label htmlFor="passengers" className="block text-xs font-medium text-frost-dark mb-1.5">
            Пассажиров
          </label>
          <select
            id="passengers"
            value={passengers}
            onChange={(event) => setPassengers(event.target.value)}
            className="select-native text-sm"
            aria-label="Количество пассажиров"
          >
            <option value="1">1 место</option>
            <option value="2">2 места</option>
            <option value="3">3 места</option>
            <option value="4">4 места</option>
          </select>
        </div>

        <button
          type="submit"
          className="btn-primary col-span-2 sm:col-auto w-full sm:w-auto min-h-[46px]"
          disabled={!isFormValid}
          aria-label="Найти попутку"
        >
          <Search className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />
          <span>Найти попутку</span>
        </button>
      </div>

      <div className="pt-2 border-t border-fog/60">
        <div className="flex items-center justify-between text-xs text-frost-dark mb-1.5">
          <span>Популярные направления</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none" role="list" aria-label="Популярные направления">
          {POPULAR_ROUTES.map((route) => (
            <button
              key={`${route.from}-${route.to}`}
              type="button"
              onClick={() => {
                setFrom(route.from);
                setTo(route.to);
                const params = new URLSearchParams({ from: route.from, to: route.to });
                router.push(`/search?${params.toString()}`);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-taiga bg-snow/80 hover:bg-river-light hover:text-river border border-fog rounded-full transition-colors whitespace-nowrap flex-shrink-0"
              role="listitem"
            >
              <MapPin className="w-3 h-3 text-frost flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <span>
                {route.from} → {route.to}
              </span>
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
