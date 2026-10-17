"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Calendar, Search, ArrowUpDown, MapPin } from "lucide-react";
import StopCombobox from "@/components/StopCombobox";

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

  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");
  const [date, setDate] = useState(searchParams.get("date") || "");
  const [passengers, setPassengers] = useState(searchParams.get("passengers") || "1");

  const isFormValid = Boolean(from && to && from !== to);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
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
    <form onSubmit={handleSubmit} className="space-y-3" role="search" aria-label="Поиск попутки" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_44px_1fr] gap-3 items-end">
        <motion.div {...fadeUp(0.1)}>
          <StopCombobox
            id="from"
            label="Откуда"
            value={from}
            onChange={setFrom}
            placeholder="Начни вводить остановку"
          />
        </motion.div>

        <motion.button
          type="button"
          onClick={swapLocations}
          {...fadeUp(0.15)}
          className="swap-btn hidden sm:flex mb-0.5"
          aria-label="Поменять местами"
        >
          <ArrowUpDown className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
        </motion.button>

        <motion.div {...fadeUp(0.2)}>
          <StopCombobox id="to" label="Куда" value={to} onChange={setTo} placeholder="Куда едем?" />
        </motion.div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-[10rem_9rem_auto] gap-3 items-end">
        <motion.div {...fadeUp(0.25)}>
          <label htmlFor="date" className="block text-xs font-medium text-frost-dark mb-1.5">
            Дата
          </label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-frost pointer-events-none">
              <Calendar className="w-[18px] h-[18px]" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <input
              id="date"
              type="date"
              min={todayISO()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="input pl-10 font-utility"
              aria-label="Дата поездки"
            />
          </div>
        </motion.div>

        <motion.div {...fadeUp(0.3)}>
          <label htmlFor="passengers" className="block text-xs font-medium text-frost-dark mb-1.5">
            Пассажиров
          </label>
          <select
            id="passengers"
            value={passengers}
            onChange={(event) => setPassengers(event.target.value)}
            className="select-native"
            aria-label="Количество пассажиров"
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </motion.div>

        <motion.button
          type="submit"
          {...fadeUp(0.35)}
          className="btn-primary col-span-2 sm:col-auto w-full sm:w-auto min-h-[46px]"
          disabled={!isFormValid}
          aria-label="Найти попутку"
        >
          <Search className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />
          <span>Найти попутку</span>
        </motion.button>
      </div>

      <motion.div {...fadeUp(0.4)} className="pt-1">
        <p className="text-xs font-medium text-frost-dark mb-2">Популярные направления</p>
        <div className="flex flex-wrap gap-2" role="list" aria-label="Популярные направления">
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
              className="chip"
              role="listitem"
            >
              <MapPin className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
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
