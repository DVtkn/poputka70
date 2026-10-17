"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Car, ChevronRight, RefreshCw, ShieldCheck, Star } from "lucide-react";
import { apiError } from "@/lib/api-client";

interface FeedTrip {
  id: string;
  date: string;
  departureTime: string;
  originName: string;
  destName: string;
  priceFull: number;
  seatsLeft: number;
  seatsTotal: number;
  comment: string | null;
  driver: {
    id: string;
    firstName: string;
    lastName: string | null;
    ratingAsDriver: number;
    verified: boolean;
    carModel: string | null;
  };
}

const DAY_FMT = new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Tomsk", day: "numeric", month: "short" });
const KEY_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tomsk" });

function dayLabel(dateISO: string): string {
  const date = new Date(dateISO);
  const key = KEY_FMT.format(date);
  const now = new Date();
  if (key === KEY_FMT.format(now)) return "сегодня";
  if (key === KEY_FMT.format(new Date(now.getTime() + 24 * 60 * 60 * 1000))) return "завтра";
  return DAY_FMT.format(date);
}

function timeLabel(value: string): string {
  return new Date(value).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tomsk",
  });
}

export default function RouteList() {
  const [trips, setTrips] = useState<FeedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/trips?limit=12");
        const data = (await res.json().catch(() => null)) as { success?: boolean; trips?: FeedTrip[] } | null;
        if (!active) return;
        if (!res.ok || !data?.success) {
          setError(apiError(data, "Не удалось загрузить ленту").message);
          return;
        }
        setTrips(data.trips ?? []);
      } catch {
        if (active) setError("Ошибка сети. Обнови страницу.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [attempt]);

  return (
    <section className="section pt-8 md:pt-10">
      <div className="container">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-h2 text-taiga mb-1">Ближайшие попутки</h2>
            <p className="text-sm text-frost-dark">Лента обновляется сразу после публикации</p>
          </div>
          {!loading && trips.length > 0 && (
            <span className="badge badge-river font-utility">{trips.length} в ленте</span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((index) => (
              <div key={index} className="card p-5">
                <div className="flex items-center gap-4">
                  <div className="skeleton w-16 h-10" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-5 w-2/3" />
                    <div className="skeleton h-4 w-1/2" />
                  </div>
                  <div className="skeleton h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card p-10 text-center">
            <h3 className="text-h3 mb-2">Не получилось загрузить попутки</h3>
            <p className="text-frost-dark mb-5">{error}</p>
            <button onClick={() => setAttempt((value) => value + 1)} className="btn-secondary inline-flex">
              <RefreshCw className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
              Попробовать снова
            </button>
          </div>
        ) : trips.length === 0 ? (
          <div className="card p-10 md:p-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-4">
              <Car className="w-7 h-7 text-river" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <h3 className="text-h3 mb-2">Пока тихо</h3>
            <p className="text-frost-dark mb-6 max-w-sm mx-auto">
              Сегодня попуток нет. Если ты за рулём — опубликуй поездку за полминуты, и соседи подтянутся.
            </p>
            <Link href="/driver" className="btn-primary inline-flex">Опубликовать поездку</Link>
          </div>
        ) : (
          <div className="space-y-3" role="list" aria-label="Лента попуток">
            {trips.map((trip, index) => (
              <motion.div
                key={trip.id}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                role="listitem"
              >
                <Link href={`/trips/${trip.id}`} className="card card-hover block p-4 md:p-5 group">
                  <div className="flex items-stretch gap-4">
                    <div className="w-[64px] md:w-[76px] flex-shrink-0 border-r border-fog pr-3 md:pr-4">
                      <div className="font-utility text-lg md:text-xl font-bold leading-none">
                        {timeLabel(trip.departureTime)}
                      </div>
                      <div className="text-[11px] text-frost-dark mt-1.5">{dayLabel(trip.date)}</div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-taiga truncate">
                        {trip.originName} → {trip.destName}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-frost-dark">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="avatar avatar-sm text-[10px]">{trip.driver.firstName.charAt(0)}</span>
                          {trip.driver.firstName}
                        </span>
                        {trip.driver.verified && (
                          <span className="badge badge-birch py-0.5">
                            <ShieldCheck className="w-3 h-3" strokeWidth={2} aria-hidden="true" />
                            Проверен
                          </span>
                        )}
                        <span className="font-utility text-taiga inline-flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-birch fill-birch" aria-hidden="true" />
                          {(trip.driver.ratingAsDriver || 5).toFixed(1)}
                        </span>
                        {trip.driver.carModel && <span className="truncate">{trip.driver.carModel}</span>}
                      </div>
                      {trip.comment && (
                        <p className="text-sm text-frost-dark italic mt-1 line-clamp-1">«{trip.comment}»</p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0 flex flex-col justify-between">
                      <div>
                        <div className="font-utility text-lg md:text-xl font-bold leading-none">{trip.priceFull} ₽</div>
                        <div className="text-[11px] text-frost-dark mt-1">за место</div>
                      </div>
                      <div className="text-[11px] text-frost-dark mt-2">
                        свободно {trip.seatsLeft} из {trip.seatsTotal}
                      </div>
                    </div>

                    <ChevronRight
                      className="w-5 h-5 text-fog group-hover:text-river group-hover:translate-x-0.5 transition-all flex-shrink-0 self-center"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && trips.length > 0 && (
          <div className="mt-6 text-center">
            <Link href="/search" className="btn-secondary inline-flex">Искать по остановкам</Link>
          </div>
        )}
      </div>
    </section>
  );
}
