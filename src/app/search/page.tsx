"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, RefreshCw, Search, SearchX, Shield, Star } from "lucide-react";
import StickyHeader from "@/components/StickyHeader";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import SearchForm from "@/components/SearchForm";
import DemandRequestForm from "@/components/DemandRequestForm";
import { apiError } from "@/lib/api-client";

interface TripResult {
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

function timeLabel(value: string): string {
  return new Date(value).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tomsk",
  });
}

function dayLabel(dateISO: string): string {
  const trip = new Date(dateISO);
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tomsk" });
  const tripKey = fmt.format(trip);
  if (tripKey === fmt.format(now)) return "Сегодня";
  if (tripKey === fmt.format(new Date(now.getTime() + 24 * 60 * 60 * 1000))) return "Завтра";
  return new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Tomsk", day: "numeric", month: "long" }).format(trip);
}

function ResultsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Загрузка попуток">
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
  );
}

function SearchResults() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const date = searchParams.get("date") || "";
  const passengers = searchParams.get("passengers") || "1";

  const [trips, setTrips] = useState<TripResult[]>([]);
  const [loading, setLoading] = useState(Boolean(from && to));
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [isEditingSearch, setIsEditingSearch] = useState(false);

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
        const res = await fetch(`/api/trips?${params.toString()}`);
        const data = (await res.json().catch(() => null)) as { success?: boolean; trips?: TripResult[] } | null;
        if (!active) return;
        if (!res.ok || !data?.success) {
          setError(apiError(data, "Не удалось загрузить попутки").message);
          setTrips([]);
          return;
        }
        setTrips(data.trips ?? []);
      } catch {
        if (active) {
          setError("Ошибка сети. Проверь соединение.");
          setTrips([]);
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
    <div className="flex flex-col min-h-screen bg-snow text-taiga pb-24 md:pb-0">
      <StickyHeader />
      <main id="main" className="flex-1">
        <section className="bg-snow">
          <div className="container py-4 md:py-12">
            {/* На десктопе всегда полная карточка поиска */}
            <div className={`card p-5 md:p-8 mb-6 ${hasSearch ? "hidden md:block" : "block"}`}>
              <h1 className="text-h3 mb-5">Куда едем?</h1>
              <SearchForm />
            </div>

            {/* На мобильном при активном поиске — компактный бар вместо огромной формы */}
            {hasSearch && (
              <div className="md:hidden mb-4">
                {isEditingSearch ? (
                  <div className="card p-4 shadow-sm border border-fog">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-semibold text-base">Изменить поиск</h2>
                      <button
                        type="button"
                        onClick={() => setIsEditingSearch(false)}
                        className="text-xs text-frost-dark hover:text-taiga py-1 px-2.5 rounded-lg bg-fog/50"
                      >
                        ✕ Закрыть
                      </button>
                    </div>
                    <SearchForm onSearchSubmitted={() => setIsEditingSearch(false)} />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingSearch(true)}
                    className="w-full card p-3 flex items-center justify-between gap-3 text-left active:scale-[0.99] transition-all border border-fog/80 shadow-xs"
                    aria-label="Изменить параметры поиска"
                  >
                    <div className="w-9 h-9 rounded-xl bg-river-light text-river flex items-center justify-center flex-shrink-0">
                      <Search className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-taiga truncate">
                        {from} → {to}
                      </div>
                      <div className="text-[11px] text-frost-dark flex items-center gap-1.5 mt-0.5">
                        <span>{date ? date : "Сегодня"}</span>
                        <span>•</span>
                        <span>{passengers} {passengers === "1" ? "место" : "места"}</span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-river bg-river-light px-2.5 py-1.5 rounded-lg flex-shrink-0">
                      Изменить
                    </span>
                  </button>
                )}
              </div>
            )}

            {hasSearch && (
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <h2 className="font-display text-xl md:text-2xl font-bold tracking-[-0.01em]">
                  {loading
                    ? `Ищем попутки ${from} → ${to}`
                    : trips.length > 0
                      ? `Попутки ${from} → ${to}`
                      : `Пока никто не едет: ${from} → ${to}`}
                </h2>
                {!loading && date && <span className="badge badge-river font-utility">{date}</span>}
                {!loading && passengers !== "1" && <span className="badge badge-birch">{passengers} мест</span>}
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
            ) : hasSearch && trips.length === 0 && !error ? (
              <div className="space-y-6">
                <div className="card p-10 md:p-14 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-4">
                    <SearchX className="w-8 h-8 text-river" strokeWidth={1.5} aria-hidden="true" />
                  </div>
                  <h3 className="text-h3 mb-2">Пока никто не едет</h3>
                  <p className="text-frost-dark mb-6 max-w-md mx-auto leading-relaxed">
                    Оставь заявку — водители увидят спрос и опубликуют поездку. Или посмотри все попутки города.
                  </p>
                  <Link href="/" className="btn-secondary inline-block px-6 py-3">
                    Все попутки
                  </Link>
                </div>
                <DemandRequestForm defaultFromName={from} defaultToName={to} />
              </div>
            ) : (
              <div className="space-y-4" role="list" aria-label="Результаты поиска">
                {trips.map((trip) => (
                  <div
                    key={trip.id}
                    role="listitem"
                  >
                    <Link href={`/trips/${trip.id}`} className="card card-hover block p-3.5 sm:p-5 md:p-6 group">
                      {/* Мобильная раскладка (< md) */}
                      <div className="md:hidden space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-utility font-bold text-lg text-taiga leading-none">
                              {timeLabel(trip.departureTime)}
                            </span>
                            <span className="badge badge-frost py-0.5 text-[11px]">
                              {dayLabel(trip.date)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-utility font-bold text-lg text-taiga leading-none">{trip.legPrice} ₽</span>
                            <span className="text-[11px] text-frost-dark ml-1">· {trip.legKm} км</span>
                          </div>
                        </div>

                        <div className="font-semibold text-taiga text-[15px] leading-snug">
                          {trip.originName} → {trip.destName}
                        </div>

                        {trip.comment && (
                          <p className="text-xs text-frost-dark italic line-clamp-1">«{trip.comment}»</p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-fog text-xs text-frost-dark">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="avatar avatar-xs text-[10px]">{trip.driver.firstName.charAt(0)}</span>
                            <span className="font-medium text-taiga truncate">{trip.driver.firstName}</span>
                            {trip.driver.verified && (
                              <span className="badge badge-birch py-0 px-1.5 text-[10px]">
                                Проверен
                              </span>
                            )}
                            <span className="inline-flex items-center gap-0.5 text-taiga font-medium">
                              <Star className="w-3 h-3 text-birch fill-birch" />
                              {(trip.driver.ratingAsDriver || 5).toFixed(1)}
                            </span>
                            {trip.driver.carModel && <span className="truncate">· {trip.driver.carModel}</span>}
                          </div>
                          <span className="flex-shrink-0 text-frost-dark text-[11px] ml-2">
                            свободно {trip.seatsLeft} из {trip.seatsTotal}
                          </span>
                        </div>
                      </div>

                      {/* Десктопная раскладка (>= md) */}
                      <div className="hidden md:flex items-start gap-4">
                        <div className="text-center flex-shrink-0 w-[72px]">
                          <div className="font-utility font-bold text-xl leading-none">
                            {timeLabel(trip.departureTime)}
                          </div>
                          <div className="text-xs text-frost-dark mt-1">{dayLabel(trip.date)}</div>
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
                          <div className="font-utility font-bold text-2xl text-taiga">{trip.legPrice} ₽</div>
                          <div className="text-xs text-frost-dark">
                            твой отрезок · {trip.legKm} км
                          </div>
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
                  </div>
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
