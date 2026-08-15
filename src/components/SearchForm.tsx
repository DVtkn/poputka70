"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { MapPin, Calendar, Users, Search, ArrowUpDown } from "lucide-react";

type CityPoint = {
  id: string;
  name: string;
  type: string;
  category?: string;
  lat: number;
  lng: number;
};

const FALLBACK_POINTS: CityPoint[] = [
  { id: "1", name: "Южные Ворота", type: "stop", category: "stop", lat: 56.48, lng: 84.95 },
  { id: "2", name: "ТПУ", type: "stop", category: "stop", lat: 56.46, lng: 84.99 },
  { id: "3", name: "Каштак", type: "stop", category: "stop", lat: 56.50, lng: 84.97 },
  { id: "4", name: "Солнечный", type: "stop", category: "stop", lat: 56.47, lng: 85.02 },
  { id: "5", name: "Центр", type: "stop", category: "stop", lat: 56.48, lng: 84.95 },
  { id: "6", name: "КИР", type: "stop", category: "stop", lat: 56.49, lng: 84.93 },
  { id: "7", name: "Пригород", type: "district", category: "district", lat: 56.45, lng: 84.90 },
  { id: "8", name: "Северск", type: "district", category: "district", lat: 56.60, lng: 84.85 },
  { id: "9", name: "Асино", type: "district", category: "district", lat: 57.00, lng: 86.15 },
  { id: "10", name: "Колпашево", type: "district", category: "district", lat: 58.30, lng: 82.95 },
];

const popularRoutes = [
  { from: "Южные Ворота", to: "ТПУ" },
  { from: "Каштак", to: "ТПУ" },
  { from: "Солнечный", to: "Центр" },
  { from: "КИР", to: "ТПУ" },
];

export default function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [points, setPoints] = useState<CityPoint[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");
  const [date, setDate] = useState(searchParams.get("date") || "");
  const [passengers, setPassengers] = useState(searchParams.get("passengers") || "1");

  const today = new Date();
  const minDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];

  useEffect(() => {
    let cancelled = false;
    
    const loadPoints = async () => {
      try {
        setLoadingPoints(true);
        setError(null);
        const res = await fetch("/api/city-points");
        
        if (!res.ok) throw new Error("Failed to fetch");
        
        const data = await res.json();
        
        if (cancelled) return;
        
        if (data.success && data.points && data.points.length > 0) {
          const filtered = data.points
            .filter((p: CityPoint) => p.category === "stop" || p.category === "district")
            .sort((a: CityPoint, b: CityPoint) => a.name.localeCompare(b.name));
          
          if (filtered.length > 0) {
            setPoints(filtered);
          } else {
            setPoints(FALLBACK_POINTS);
          }
        } else {
          setPoints(FALLBACK_POINTS);
        }
      } catch {
        if (!cancelled) {
          setError("Не удалось загрузить точки. Используем список по умолчанию.");
          setPoints(FALLBACK_POINTS);
        }
      } finally {
        if (!cancelled) setLoadingPoints(false);
      }
    };

    loadPoints();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!from || !to) return;
    if (from === to) return;
    
    const params = new URLSearchParams();
    params.set("from", from);
    params.set("to", to);
    if (date) params.set("date", date);
    if (passengers !== "1") params.set("passengers", passengers);
    
    router.push(`/search?${params.toString()}`);
  };

  const swapLocations = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  const handleFromChange = (value: string) => {
    setFrom(value);
  };

  const handleToChange = (value: string) => {
    setTo(value);
  };

  const isFormValid = from && to && from !== to;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:grid sm:grid-cols-[1fr_48px_1fr_auto_auto] sm:gap-4 sm:items-end" role="search" aria-label="Поиск попутки" noValidate>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="relative"
      >
        <label htmlFor="from" className="block text-xs font-medium text-frost mb-1.5">Откуда</label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-frost pointer-events-none">
            <MapPin className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <select
            id="from"
            value={from}
            onChange={(e) => handleFromChange(e.target.value)}
            className="select-native pl-12 pr-12"
            required
            aria-label="Пункт отправления"
            disabled={loadingPoints}
          >
            <option value="">Выберите точку</option>
            {points.map((p) => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
          {loadingPoints && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-river border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-ember" role="alert">{error}</p>}
      </motion.div>

      <motion.button
        type="button"
        onClick={swapLocations}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="swap-btn sm:hidden md:flex"
        aria-label="Поменять местами"
      >
        <ArrowUpDown className="w-5 h-5" strokeWidth={1.5} />
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="relative"
      >
        <label htmlFor="to" className="block text-xs font-medium text-frost mb-1.5">Куда</label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-frost pointer-events-none">
            <MapPin className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <select
            id="to"
            value={to}
            onChange={(e) => handleToChange(e.target.value)}
            className="select-native pl-12 pr-12"
            required
            aria-label="Пункт назначения"
            disabled={loadingPoints}
          >
            <option value="">Выберите точку</option>
            {points.map((p) => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
          {loadingPoints && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-river border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5 }}
        className="sm:w-44"
      >
        <label htmlFor="date" className="block text-xs font-medium text-frost mb-1.5">Дата</label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-frost pointer-events-none">
            <Calendar className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <input
            id="date"
            type="date"
            min={minDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input pl-12"
            aria-label="Дата поездки"
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="sm:w-36"
      >
        <label htmlFor="passengers" className="block text-xs font-medium text-frost mb-1.5">Пассажиров</label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-frost pointer-events-none">
            <Users className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <select
            id="passengers"
            value={passengers}
            onChange={(e) => setPassengers(e.target.value)}
            className="select-native pl-12"
            aria-label="Количество пассажиров"
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.5 }}
        className="btn-primary w-full sm:w-auto group"
        disabled={!isFormValid || loadingPoints}
        aria-label="Найти попутку"
      >
        <Search className="w-5 h-5" strokeWidth={2} />
        <span>Найти попутку</span>
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="sm:col-span-5 lg:col-span-6"
      >
        <p className="text-xs font-medium text-frost mb-2">Популярные направления</p>
        <div className="flex flex-wrap gap-2" role="list" aria-label="Популярные направления">
          {popularRoutes.map((route, i) => (
            <motion.button
              key={i}
              type="button"
              onClick={() => { setFrom(route.from); setTo(route.to); }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 + i * 0.05, duration: 0.4 }}
              className="chip"
              role="listitem"
            >
              <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>{route.from} → {route.to}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </form>
  );
}