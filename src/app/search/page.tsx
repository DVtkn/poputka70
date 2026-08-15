"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { MapPin, Star, Shield, SearchX } from "lucide-react";
import StickyHeader from "@/components/StickyHeader";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import SearchForm from "@/components/SearchForm";
import StatusBadge from "@/components/ui/StatusBadge";

type Trip = { id: string; date: string; departureTime: string; status: string; availableSeats: number; totalSeats: number };
type Route = { id: string; from: string; to: string; time: string; price: number; seats: number; days: string; driver: { id: string; name: string; car: string; carColor: string; verified: boolean; ratingAsDriver: number; }; nextTrips: Trip[] };

function SearchResults() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const date = searchParams.get("date") || "";
  const passengers = searchParams.get("passengers") || "1";

  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(!!(from && to));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!from || !to) return;
    const params = new URLSearchParams();
    params.set("from", from);
    params.set("to", to);
    if (date) params.set("date", date);
    if (passengers !== "1") params.set("passengers", passengers);

    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch(`/api/routes?${params.toString()}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          setRoutes(data.routes || []);
        } else {
          setError(data.error || "Ошибка загрузки");
          setRoutes([]);
        }
      } catch {
        if (!cancelled) {
          setError("Ошибка сети");
          setRoutes([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [from, to, date, passengers]);

  const formatDate = (ds: string) => {
    const d = new Date(ds);
    const m = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
    return d.getDate() + " " + m[d.getMonth()];
  };

  const hasSearch = !!from && !!to;

  return (
    <div className="flex flex-col min-h-screen bg-snow text-taiga pb-20 md:pb-0">
      <StickyHeader />
      <main className="flex-1 pt-16">
        <section className="bg-snow">
          <div className="container py-8 md:py-12">
            <div className="card p-5 md:p-8 mb-8">
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-[-0.02em] mb-5">
                Поиск попутки
              </h1>
              <SearchForm />
            </div>

            {hasSearch && (
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <h2 className="font-display text-xl md:text-2xl font-bold tracking-[-0.01em]">
                  {routes.length > 0 ? `Маршруты ${from} → ${to}` : `Ничего не найдено: ${from} → ${to}`}
                </h2>
                {loading && <div className="w-5 h-5 border-2 border-river border-t-transparent rounded-full animate-spin" aria-label="Загрузка" />}
                {date && <span className="badge badge-river font-utility">{formatDate(date)}</span>}
                {passengers !== "1" && <span className="badge badge-birch">{passengers} мест</span>}
              </div>
            )}

            {error && (
              <div className="bg-ember/10 border border-ember/20 rounded-xl p-4 text-ember text-sm mb-6" role="alert">
                {error}
              </div>
            )}

            {loading ? (
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
            ) : hasSearch && routes.length === 0 && !error ? (
              <div className="card p-10 md:p-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-4">
                  <SearchX className="w-8 h-8 text-river" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-xl md:text-2xl font-bold mb-2">Маршрутов пока нет</h3>
                <p className="text-frost mb-6 max-w-sm mx-auto leading-relaxed">
                  Водители ещё не создали маршрут по этому направлению. Загляни позже или создай запрос о потребности.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/" className="btn-secondary">Все маршруты</Link>
                  <Link href="/profile" className="btn-primary">Запросить направление</Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4" role="list" aria-label="Результаты поиска">
                {routes.map((route, idx) => (
                  <motion.div
                    key={route.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    role="listitem"
                  >
                    <Link
                      href={"/routes/" + route.id}
                      className="card block p-5 md:p-6 group relative overflow-hidden transition-all duration-300 hover:border-river/30 card-hover"
                    >
                      <div className="flex items-center gap-4">
                        <div className="avatar avatar-lg flex-shrink-0">
                          {route.driver.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-taiga truncate">{route.driver.name}</span>
                            {route.driver.verified && (
                              <span className="badge badge-river flex items-center gap-1">
                                <Shield className="w-3 h-3" strokeWidth={2} />
                                Проверен
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-frost mt-1 flex-wrap">
                            <span className="font-utility text-birch flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 fill-current" strokeWidth={0} />
                              {(route.driver.ratingAsDriver || 5).toFixed(1)}
                            </span>
                            <span className="text-fog">•</span>
                            <span className="truncate">{route.driver.car}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 min-w-[100px]">
                          <div className="font-utility font-bold text-2xl md:text-3xl text-taiga">{route.price} ₽</div>
                          <div className="text-xs text-frost">за место</div>
                        </div>
                      </div>

                      <div className="mt-5 pt-5 border-t border-fog/50">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-1.5 text-sm text-taiga font-medium">
                            <MapPin className="w-4 h-4 text-birch" strokeWidth={2} />
                            <span className="truncate max-w-[180px]">{route.from}</span>
                          </div>
                          <div className="w-4 h-4 rounded-full bg-fog/50 flex-shrink-0" />
                          <div className="flex items-center gap-1.5 text-sm text-taiga font-medium">
                            <MapPin className="w-4 h-4 text-river" strokeWidth={2} />
                            <span className="truncate max-w-[180px]">{route.to}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-frost">
                            <span className="font-utility whitespace-nowrap">{route.time}</span>
                            <span className="text-fog">•</span>
                            <span>{route.days}</span>
                          </div>
                        </div>

                        {route.nextTrips.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-fog/50">
                            <div className="text-xs text-frost uppercase tracking-wider font-semibold mb-2">
                              {date ? "Рейсы на выбранную дату" : "Ближайшие рейсы"}
                            </div>
                            <div className="space-y-2">
                              {route.nextTrips.slice(0, 3).map((trip) => (
                                <div key={trip.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-fog/50">
                                  <div className="flex items-center gap-3">
                                    <span className="font-utility font-bold text-sm whitespace-nowrap">{formatDate(trip.date)}</span>
                                    <span className="font-utility text-frost whitespace-nowrap">{trip.departureTime}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {trip.availableSeats > 0 ? (
                                      <span className="text-sm text-frost whitespace-nowrap">
                                        {trip.availableSeats - parseInt(passengers) >= 0 ? "Мест достаточно" : `${trip.availableSeats}/${trip.totalSeats} мест`}
                                      </span>
                                    ) : (
                                      <span className="text-sm text-ember font-medium whitespace-nowrap">Мест нет</span>
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
    <Suspense fallback={
      <div className="min-h-screen bg-snow flex items-center justify-center">
        <div className="skeleton w-32 h-8 rounded-xl" />
      </div>
    }>
      <SearchResults />
    </Suspense>
  );
}