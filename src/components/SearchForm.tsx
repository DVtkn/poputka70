"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { MapPin, Calendar, Users, Search, ArrowUpDown } from "lucide-react";

type CityPoint = {
  id: string;
  name: string;
  type: "ORIGIN" | "DESTINATION" | "BOTH";
  category: string;
};

const POPULAR_ROUTES = [
  { from: "Южные Ворота", to: "ТГУ" },
  { from: "Каштак", to: "Площадь Ленина" },
  { from: "Зелёные Горки", to: "ТПУ" },
  { from: "Аэропорт", to: "Ж/Д вокзал Томск-1" },
];

function todayISO(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];
}

export default function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduce = useReducedMotion();

  const [points, setPoints] = useState<CityPoint[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [pointsError, setPointsError] = useState(false);
  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");
  const [date, setDate] = useState(searchParams.get("date") || "");
  const [passengers, setPassengers] = useState(searchParams.get("passengers") || "1");

  useEffect(() => {
    let active = true;

    const loadPoints = async () => {
      try {
        const res = await fetch("/api/city-points");
        const data = (await res.json().catch(() => null)) as { success?: boolean; points?: CityPoint[] } | null;
        if (!active) return;
        if (!res.ok || !data?.success || !data.points || data.points.length === 0) {
          setPointsError(true);
          return;
        }
        setPoints(data.points);
      } catch {
        if (active) setPointsError(true);
      } finally {
        if (active) setLoadingPoints(false);
      }
    };

    void loadPoints();
    return () => {
      active = false;
    };
  }, []);

  const originPoints = points.filter((p) => p.type !== "DESTINATION");
  const destinationPoints = points.filter((p) => p.type !== "ORIGIN");
  const isFormValid = Boolean(from && to && from !== to);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const params = new URLSearchParams();
    params.set("from", from);
    params.set("to", to);
    if (date) params.set("date", date);
    if (passengers !== "1") params.set("passengers", passengers);

    router.push(`/search?${params.toString()}`);
  };

  const swapLocations = () => {
    setFrom(to);
    setTo(from);
  };

  const fadeUp = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 sm:grid sm:grid-cols-[1fr_48px_1fr_auto_auto] sm:gap-4 sm:items-end"
      role="search"
      aria-label="Поиск попутки"
      noValidate
    >
      <motion.div {...fadeUp(0.1)} className="relative">
        <label htmlFor="from" className="block text-xs font-medium text-frost-dark mb-1.5">
          Откуда
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-frost pointer-events-none">
            <MapPin className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <select
            id="from"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="select-native pl-12"
            required
            aria-label="Пункт отправления"
            disabled={loadingPoints || pointsError}
          >
            <option value="">Выберите точку</option>
            {originPoints.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      <motion.button
        type="button"
        onClick={swapLocations}
        {...fadeUp(0.15)}
        className="swap-btn mb-1.5"
        aria-label="Поменять местами"
      >
        <ArrowUpDown className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
      </motion.button>

      <motion.div {...fadeUp(0.2)} className="relative">
        <label htmlFor="to" className="block text-xs font-medium text-frost-dark mb-1.5">
          Куда
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-frost pointer-events-none">
            <MapPin className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <select
            id="to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="select-native pl-12"
            required
            aria-label="Пункт назначения"
            disabled={loadingPoints || pointsError}
          >
            <option value="">Выберите точку</option>
            {destinationPoints.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      <motion.div {...fadeUp(0.25)} className="sm:w-44">
        <label htmlFor="date" className="block text-xs font-medium text-frost-dark mb-1.5">
          Дата
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-frost pointer-events-none">
            <Calendar className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <input
            id="date"
            type="date"
            min={todayISO()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input pl-12"
            aria-label="Дата поездки"
          />
        </div>
      </motion.div>

      <motion.div {...fadeUp(0.3)} className="sm:w-36">
        <label htmlFor="passengers" className="block text-xs font-medium text-frost-dark mb-1.5">
          Пассажиров
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-frost pointer-events-none">
            <Users className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <select
            id="passengers"
            value={passengers}
            onChange={(e) => setPassengers(e.target.value)}
            className="select-native pl-12"
            aria-label="Количество пассажиров"
            disabled={loadingPoints || pointsError}
          >
            <option value="1">1 пассажир</option>
            <option value="2">2 пассажира</option>
            <option value="3">3 пассажира</option>
            <option value="4">4 пассажира</option>
          </select>
        </div>
      </motion.div>

      <motion.button
        type="submit"
        {...fadeUp(0.35)}
        className="btn-primary w-full sm:w-auto"
        disabled={!isFormValid || loadingPoints || pointsError}
        aria-label="Найти попутку"
      >
        {loadingPoints ? (
          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        ) : (
          <Search className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
        )}
        <span>Найти попутку</span>
      </motion.button>

      {pointsError && (
        <p className="sm:col-span-5 lg:col-span-6 text-sm text-ember" role="alert">
          Не удалось загрузить список точек. Обнови страницу или попробуй позже.
        </p>
      )}

      <motion.div {...fadeUp(0.4)} className="sm:col-span-5 lg:col-span-6">
        <p className="text-xs font-medium text-frost-dark mb-2">Популярные направления</p>
        <div className="flex flex-wrap gap-2" role="list" aria-label="Популярные направления">
          {POPULAR_ROUTES.map((route) => (
            <button
              key={`${route.from}-${route.to}`}
              type="button"
              onClick={() => {
                setFrom(route.from);
                setTo(route.to);
              }}
              className="chip py-2.5"
              role="listitem"
              disabled={loadingPoints || pointsError}
            >
              <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} aria-hidden="true" />
              <span>
                {route.from} → {route.to}
              </span>
            </button>
          ))}
        </div>
      </motion.div>
    </form>
  );
}
