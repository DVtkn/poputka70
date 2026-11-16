"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Car, ChevronRight, RefreshCw, ShieldCheck, Star } from "lucide-react";
import { apiError } from "@/lib/api-client";
import { plural } from "@/lib/utils";

export interface FeedTrip {
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

export default function RouteList({ initialTrips }: { initialTrips?: FeedTrip[] }) {
  const [trips, setTrips] = useState<FeedTrip[]>(initialTrips ?? []);
  const [loading, setLoading] = useState(initialTrips === undefined);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (initialTrips !== undefined && attempt === 0) return;

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
  }, [attempt, initialTrips]);

  return (
    <section className="py-6 md:py-8">
      <div className="container">
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="text-h2 text-taiga">Ближайшие поездки</h2>
            {!loading && trips.length > 0 && (
              <span className="text-sm text-frost-dark font-utility">
                {trips.length} {plural(trips.length, ["рейс", "рейса", "рейсов"])}
              </span>
            )}
          </div>
          {!loading && trips.length > 0 && (
            <Link href="/search" className="text-sm font-medium text-river hover:underline">
              Фильтр по остановкам
            </Link>
          )}
        </div>

        {loading ? (
          <div className="bg-white border border-fog rounded-xl divide-y divide-fog">
            {[1, 2, 3].map((index) => (
              <div key={index} className="p-4 flex items-center gap-4">
                <div className="skeleton w-16 h-10" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-5 w-2/3" />
                  <div className="skeleton h-4 w-1/2" />
                </div>
                <div className="skeleton h-8 w-20" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white border border-fog rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-taiga">Не удалось загрузить поездки</h3>
              <p className="text-sm text-frost-dark mt-0.5">{error}</p>
            </div>
            <button onClick={() => setAttempt((value) => value + 1)} className="btn-secondary flex-shrink-0">
              <RefreshCw className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
              Повторить
            </button>
          </div>
        ) : trips.length === 0 ? (
          <div className="bg-white border border-fog rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Car className="w-5 h-5 text-river flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-taiga">Ближайших поездок пока нет</h3>
                <p className="text-sm text-frost-dark mt-0.5">
                  Опубликуйте маршрут, чтобы он появился в ленте.
                </p>
              </div>
            </div>
            <Link href="/driver" className="btn-primary flex-shrink-0 whitespace-nowrap">
              Опубликовать поездку
            </Link>
          </div>
        ) : (
          <div
            className="bg-white border border-fog rounded-xl divide-y divide-fog overflow-hidden"
            role="list"
            aria-label="Лента поездок"
          >
            {trips.map((trip) => (
              <div key={trip.id} role="listitem">
                <Link
                  href={`/trips/${trip.id}`}
                  className="block px-4 py-3.5 sm:px-5 sm:py-4 hover:bg-snow/70 transition-colors group"
                >
                  {/* Мобильная раскладка (< md) */}
                  <div className="md:hidden space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-baseline gap-2">
                        <span className="font-utility text-lg font-bold text-taiga leading-none">
                          {timeLabel(trip.departureTime)}
                        </span>
                        <span className="text-xs text-frost-dark">{dayLabel(trip.date)}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-utility text-lg font-bold text-taiga leading-none">
                          {trip.priceFull} ₽
                        </span>
                      </div>
                    </div>

                    <div className="font-semibold text-taiga text-[15px] leading-snug">
                      {trip.originName} → {trip.destName}
                    </div>

                    {trip.comment && (
                      <p className="text-xs text-frost-dark line-clamp-1">«{trip.comment}»</p>
                    )}

                    <div className="flex items-center justify-between pt-1.5 text-xs text-frost-dark">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="avatar avatar-xs text-[10px]">{trip.driver.firstName.charAt(0)}</span>
                        <span className="font-medium text-taiga truncate">{trip.driver.firstName}</span>
                        {trip.driver.verified && (
                          <ShieldCheck
                            className="w-3.5 h-3.5 text-river flex-shrink-0"
                            strokeWidth={2}
                            aria-label="Проверен"
                          />
                        )}
                        <span className="inline-flex items-center gap-0.5 text-taiga font-utility">
                          <Star className="w-3 h-3 text-birch fill-birch" aria-hidden="true" />
                          {(trip.driver.ratingAsDriver || 5).toFixed(1)}
                        </span>
                        {trip.driver.carModel && <span className="truncate">· {trip.driver.carModel}</span>}
                      </div>
                      <span className="flex-shrink-0 text-frost-dark text-xs font-utility ml-2">
                        {trip.seatsLeft}/{trip.seatsTotal} мест
                      </span>
                    </div>
                  </div>

                  {/* Десктопная раскладка (>= md) */}
                  <div className="hidden md:flex items-center gap-5">
                    <div className="w-[82px] flex-shrink-0 border-r border-fog pr-4">
                      <div className="font-utility text-xl font-bold leading-none text-taiga">
                        {timeLabel(trip.departureTime)}
                      </div>
                      <div className="text-xs text-frost-dark mt-1">{dayLabel(trip.date)}</div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-taiga truncate">
                        {trip.originName} → {trip.destName}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-frost-dark">
                        <span className="inline-flex items-center gap-1.5 text-taiga font-medium">
                          <span className="avatar avatar-xs text-[10px]">{trip.driver.firstName.charAt(0)}</span>
                          {trip.driver.firstName}
                        </span>
                        {trip.driver.verified && (
                          <span className="inline-flex items-center gap-1 text-xs text-river font-medium">
                            <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
                            Проверен
                          </span>
                        )}
                        <span className="text-fog">·</span>
                        <span className="font-utility text-taiga inline-flex items-center gap-1 text-xs">
                          <Star className="w-3.5 h-3.5 text-birch fill-birch" aria-hidden="true" />
                          {(trip.driver.ratingAsDriver || 5).toFixed(1)}
                        </span>
                        {trip.driver.carModel && (
                          <>
                            <span className="text-fog">·</span>
                            <span className="truncate text-xs">{trip.driver.carModel}</span>
                          </>
                        )}
                      </div>
                      {trip.comment && (
                        <p className="text-xs text-frost-dark mt-1 line-clamp-1">«{trip.comment}»</p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0 min-w-[96px]">
                      <div className="font-utility text-xl font-bold leading-none text-taiga">{trip.priceFull} ₽</div>
                      <div className="text-xs text-frost-dark mt-1 font-utility">
                        свободно {trip.seatsLeft} из {trip.seatsTotal}
                      </div>
                    </div>

                    <ChevronRight
                      className="w-4 h-4 text-fog group-hover:text-river group-hover:translate-x-0.5 transition-all flex-shrink-0"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
