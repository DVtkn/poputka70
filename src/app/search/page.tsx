"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { MapPin, Star, Shield, SearchX, RefreshCw } from "lucide-react";
import StickyHeader from "@/components/StickyHeader";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import SearchForm from "@/components/SearchForm";
import DemandRequestForm from "@/components/DemandRequestForm";
import StatusBadge from "@/components/ui/StatusBadge";
import { apiError } from "@/lib/api-client";

type Trip = {
  id: string;
  date: string;
  departureTime: string;
  status: string;
  availableSeats: number;
  totalSeats: number;
};

type Route = {
  id: string;
  from: string;
  to: string;
  time: string;
  price: number;
  seats: number;
  days: string;
  driver: {
    id: string;
    name: string;
    car: string;
    carColor: string;
    verified: boolean;
    ratingAsDriver: number;
  };
  nextTrips: Trip[];
};

function formatShortDate(value: string): string {
  const date = new Date(value);
  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]}`;
}

function ResultsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Загрузка маршрутов">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card p-5">
          <div className="flex items-center gap-4">
            <div className="skeleton w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-4 w-1/2" />
            </div>
            <div className="skeleton h-10 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SearchResults() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const date = searchParams.get("date") || "";
  const passengers = searchParams.get("passengers") || "1";

  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(Boolean(from && to));
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!from || !to) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({ from, to });
      if (date) params.set("date", date);
      if (passengers !== "1") params.set("passengers", passengers);

      try {
        const res = await fetch(`/api/routes?${params.toString()}`);
        const data = (await res.json().catch(() => null)) as { success?: boolean; routes?: Route[] } | null;
        if (!active) return;
        if (!res.ok || !data?.success) {
          setError(apiError(data, "Не удалось загрузить маршруты").message);
          setRoutes([]);
          return;
        }
        setRoutes(data.routes ?? []);
      } catch {
        if (active) {
          setError("Ошибка сети. Проверь соединение.");
          setRoutes([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [from, to, date, passengers, attempt]);

  const hasSearch = Boolean(from && to);

  return (
    <div className="flex flex-col min-h-screen bg-snow text-taiga pb-20 md:pb-0">
      <StickyHeader />
      <main id="main" className="flex-1 pt-16">
        <section className="bg-snow">
          <div className="container py-8 md:py-12">
            <div className="card p-5 md:p-8 mb-8">
              <h1 className="text-h3 mb-5">Поиск попутки</h1>
              <SearchForm />
            </div>

            {hasSearch && (
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <h2 className="font-display text-xl md:text-2xl font-bold tracking-[-0.01em]">
                  {loading
                    ? `Ищем маршруты ${from} → ${to}`
                    : routes.length > 0
                      ? `Маршруты ${from} → ${to}`
                      : `Ничего не найдено: ${from} → ${to}`}
                </h2>
                {!loading && date && <span className="badge badge-river font-utility">{date}</span>}
                {!loading && passengers !== "1" && (
                  <span className="badge badge-birch">{passengers} мест</span>
                )}
              </div>
            )}

            {error && (
              <div className="card p-6 text-center mb-6">
                <p className="text-ember mb-4" role="alert">
                  {error}
                </p>
                <button onClick={() => setAttempt((value) => value + 1)} className="btn-secondary inline-flex">
                  <RefreshCw className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
                  Попробовать снова
                </button>
              </div>
            )}

            {loading ? (
              <ResultsSkeleton />
            ) : hasSearch && routes.length === 0 && !error ? (
              <div className="space-y-6">
                <div className="card p-10 md:p-14 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-4">
                    <SearchX className="w-8 h-8 text-river" strokeWidth={1.5} aria-hidden="true" />
                  </div>
                  <h3 className="text-h3 mb-2">Маршрутов пока нет</h3>
                  <p className="text-frost-dark mb-6 max-w-sm mx-auto leading-relaxed">
                    Водители ещё не создали рейс по этому направлению. Посмотри другие точки или оставь заявку —
                    мы подскажем водителям, что направление востребовано.
                  </p>
                  <Link href="/" className="btn-secondary inline-block px-6 py-3">
                    Все маршруты
                  </Link>
                </div>
                <DemandRequestForm defaultFromName={from} defaultToName={to} />
              </div>
            ) : (
              <div className="space-y-4" role="list" aria-label="Результаты поиска">
                {routes.map((route, index) => (
                  <motion.div
                    key={route.id}
                    initial={reduce ? false : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    role="listitem"
                  >
                    <Link
                      href={`/routes/${route.id}`}
                      className="card card-hover block p-5 md:p-6 group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="avatar avatar-lg flex-shrink-0">{route.driver.name.charAt(0)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-taiga">{route.driver.name}</span>
                            {route.driver.verified && (
                              <span className="badge badge-river">
                                <Shield className="w-3 h-3" strokeWidth={2} aria-hidden="true" />
                                Проверен
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-x-3 text-sm text-frost-dark mt-1 flex-wrap">
                            <span className="font-utility text-birch-dark flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-current" strokeWidth={0} aria-hidden="true" />
                              {(route.driver.ratingAsDriver || 5).toFixed(1)}
                            </span>
                            <span aria-hidden="true">•</span>
                            <span>{route.driver.car}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-utility font-bold text-2xl md:text-3xl text-taiga">
                            {route.price} ₽
                          </div>
                          <div className="text-xs text-frost-dark">за место</div>
                        </div>
                      </div>

                      <div className="mt-5 pt-5 border-t border-fog/50">
                        <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
                          <span className="flex items-center gap-1.5 text-sm text-taiga font-medium">
                            <MapPin className="w-4 h-4 text-birch" strokeWidth={2} aria-hidden="true" />
                            {route.from}
                          </span>
                          <span className="w-3 h-3 rounded-full bg-fog/60 flex-shrink-0" aria-hidden="true" />
                          <span className="flex items-center gap-1.5 text-sm text-taiga font-medium">
                            <MapPin className="w-4 h-4 text-river" strokeWidth={2} aria-hidden="true" />
                            {route.to}
                          </span>
                          <span className="flex items-center gap-2 text-sm text-frost-dark ml-auto">
                            <span className="font-utility">{route.time}</span>
                            <span aria-hidden="true">•</span>
                            <span>{route.days}</span>
                          </span>
                        </div>

                        {route.nextTrips.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-fog/50">
                            <div className="text-caption text-frost-dark mb-2">
                              {date ? "Рейсы на выбранную дату" : "Ближайшие рейсы"}
                            </div>
                            <div className="space-y-2">
                              {route.nextTrips.slice(0, 3).map((trip) => (
                                <div
                                  key={trip.id}
                                  className="flex items-center justify-between gap-3 bg-snow rounded-xl p-3 border border-fog/50"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="font-utility font-bold text-sm whitespace-nowrap">
                                      {formatShortDate(trip.date)}
                                    </span>
                                    <span className="font-utility text-frost-dark text-sm whitespace-nowrap">
                                      {new Date(trip.departureTime).toLocaleTimeString("ru-RU", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        timeZone: "Asia/Tomsk",
                                      })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {trip.availableSeats > 0 ? (
                                      <span className="text-sm text-frost-dark whitespace-nowrap">
                                        Свободно {trip.availableSeats} из {trip.totalSeats}
                                      </span>
                                    ) : (
                                      <span className="text-sm text-ember font-medium whitespace-nowrap">
                                        Мест нет
                                      </span>
                                    )}
                                    <StatusBadge status={trip.status} type="trip" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-snow flex items-center justify-center">
          <div className="skeleton w-32 h-8 rounded-xl" />
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
