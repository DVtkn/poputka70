"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Car, ChevronRight, RefreshCw, Shield, Star } from "lucide-react";
import { apiError } from "@/lib/api-client";

interface FeedTrip {
  id: string;
  date: string;
  departureTime: string;
  originName: string;
  destName: string;
  priceFull: number;
  legPrice: number;
  legKm: number;
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
    carColor: string | null;
  };
}

function tripDayLabel(dateISO: string): string {
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Tomsk",
    day: "numeric",
    month: "short",
  });
  const trip = new Date(dateISO);
  const now = new Date();
  const fmtFull = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tomsk" });
  const tripKey = fmtFull.format(trip);
  const todayKey = fmtFull.format(now);
  const tomorrowKey = fmtFull.format(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  if (tripKey === todayKey) return "Сегодня";
  if (tripKey === tomorrowKey) return "Завтра";
  return formatter.format(trip);
}

function timeLabel(departureTime: string): string {
  return new Date(departureTime).toLocaleTimeString("ru-RU", {
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

  if (loading) {
    return (
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div className="skeleton h-9 w-56" />
          <div className="skeleton h-6 w-24 rounded-full" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((index) => (
            <div key={index} className="card p-5">
              <div className="flex items-center gap-4">
                <div className="skeleton w-14 h-14 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-5 w-3/4" />
                  <div className="skeleton h-4 w-1/2" />
                </div>
                <div className="skeleton h-10 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="card p-10 md:p-14 text-center">
          <h2 className="text-h3 mb-2">Не получилось загрузить попутки</h2>
          <p className="text-frost-dark mb-6">{error}</p>
          <button onClick={() => setAttempt((value) => value + 1)} className="btn-secondary inline-flex">
            <RefreshCw className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="container">
        <div className="card p-10 md:p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-4">
            <Car className="w-8 h-8 text-river" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <h2 className="text-h3 mb-3">Пока тихо — стань первым</h2>
          <p className="text-frost-dark mb-6 max-w-md mx-auto leading-relaxed">
            Сегодня попуток нет. Если ты за рулём — опубликуй поездку за полминуты, и соседи подтянутся.
          </p>
          <Link href="/driver" className="btn-primary inline-flex">
            Опубликовать поездку
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="flex items-end justify-between gap-4 mb-8 md:mb-10">
        <div>
          <h2 className="text-h2 mb-1">Ближайшие попутки</h2>
          <p className="text-frost-dark text-sm">Сегодня и в ближайшие дни · лента обновляется сразу после публикации</p>
        </div>
        <span className="badge badge-river font-utility flex-shrink-0">{trips.length} в ленте</span>
      </div>

      <div className="space-y-4" role="list" aria-label="Лента попуток">
        {trips.map((trip, index) => (
          <motion.div
            key={trip.id}
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            role="listitem"
          >
            <Link href={`/trips/${trip.id}`} className="card card-hover block p-5 md:p-6 group">
              <div className="flex items-start gap-4">
                <div className="text-center flex-shrink-0 w-[72px]">
                  <div className="font-utility font-bold text-xl leading-none">{timeLabel(trip.departureTime)}</div>
                  <div className="text-xs text-frost-dark mt-1">{tripDayLabel(trip.date)}</div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-taiga truncate">
                    {trip.originName} → {trip.destName}
                  </div>
                  <div className="flex items-center gap-x-3 gap-y-1 text-sm text-frost-dark mt-1 flex-wrap">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="avatar avatar-sm text-xs">{trip.driver.firstName.charAt(0)}</span>
                      {trip.driver.firstName}
                    </span>
                    {trip.driver.verified && (
                      <span className="badge badge-river">
                        <Shield className="w-3 h-3" strokeWidth={2} aria-hidden="true" />
                        Проверен
                      </span>
                    )}
                    <span className="font-utility text-birch-dark inline-flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-current" strokeWidth={0} aria-hidden="true" />
                      {(trip.driver.ratingAsDriver || 5).toFixed(1)}
                    </span>
                    {trip.driver.carModel && (
                      <>
                        <span aria-hidden="true">•</span>
                        <span>{trip.driver.carModel}</span>
                      </>
                    )}
                  </div>
                  {trip.comment && (
                    <p className="text-sm text-frost-dark italic mt-2 line-clamp-1">«{trip.comment}»</p>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="font-utility font-bold text-2xl text-taiga">{trip.priceFull} ₽</div>
                  <div className="text-xs text-frost-dark">за место</div>
                  <div className="text-xs text-frost-dark mt-1">
                    свободно {trip.seatsLeft} из {trip.seatsTotal}
                  </div>
                </div>

                <ChevronRight
                  className="w-5 h-5 text-fog group-hover:text-river group-hover:translate-x-1 transition-all duration-300 flex-shrink-0 mt-2"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link href="/driver" className="btn-secondary inline-flex group">
          <span>Едешь по городу? Опубликуй поездку</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
