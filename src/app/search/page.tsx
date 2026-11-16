"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, RefreshCw, Search, SearchX, ShieldCheck, Star, X } from "lucide-react";
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
    <div className="bg-white border border-fog rounded-xl divide-y divide-fog" aria-busy="true" aria-label="Загрузка поездок">
      {[1, 2, 3].map((index) => (
        <div key={index} className="p-4 flex items-center gap-4">
          <div className="skeleton w-16 h-10" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-5 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
          </div>
          <div className="skeleton h-8 w-20" />
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
          setError(apiError(data, "Не удалось загрузить поездки").message);
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
          <div className="container py-4 md:py-8">
            <div className={`bg-white border border-fog rounded-xl p-4 sm:p-5 mb-5 ${hasSearch ? "hidden md:block" : "block"}`}>
              <h1 className="text-h3 mb-3">Поиск поездки</h1>
              <SearchForm />
            </div>

            {hasSearch && (
              <div className="md:hidden mb-4">
                {isEditingSearch ? (
                  <div className="bg-white rounded-xl p-4 border border-fog">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-semibold text-base">Изменить поиск</h2>
                      <button
                        type="button"
                        onClick={() => setIsEditingSearch(false)}
                        className="inline-flex items-center gap-1 text-xs text-frost-dark hover:text-taiga py-1 px-2.5 rounded-lg bg-fog/50"
                      >
                        <X className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
                        Закрыть
                      </button>
                    </div>
                    <SearchForm onSearchSubmitted={() => setIsEditingSearch(false)} />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingSearch(true)}
                    className="w-full bg-white rounded-xl p-3 flex items-center justify-between gap-3 text-left border border-fog"
                    aria-label="Изменить параметры поиска"
                  >
                    <div className="w-9 h-9 rounded-lg bg-river-light text-river flex items-center justify-center flex-shrink-0">
                      <Search className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-taiga truncate">
                        {from} → {to}
                      </div>
                      <div className="text-xs text-frost-dark flex items-center gap-1.5 mt-0.5 font-utility">
                        <span>{date ? date : "Сегодня"}</span>
                        <span>·</span>
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
              <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
                <h2 className="font-display text-lg md:text-xl font-bold tracking-[-0.01em] text-taiga">
                  {loading
                    ? `Поиск: ${from} → ${to}`
                    : trips.length > 0
                      ? `${from} → ${to}`
                      : `По маршруту ${from} → ${to} поездок пока нет`}
                </h2>
                {!loading && (date || passengers !== "1" || trips.length > 0) && (
                  <div className="text-xs text-frost-dark font-utility flex items-center gap-2">
                    {trips.length > 0 && <span>Найдено: {trips.length}</span>}
                    {date && <span>· {date}</span>}
                    {passengers !== "1" && <span>· {passengers} мест</span>}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="bg-white border border-fog rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <p className="text-sm text-ember" role="alert">
                  {error}
                </p>
                <button onClick={() => setAttempt((value) => value + 1)} className="btn-secondary flex-shrink-0">
                  <RefreshCw className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
                  Попробовать снова
                </button>
              </div>
            )}

            {loading ? (
              <ResultsSkeleton />
            ) : hasSearch && trips.length === 0 && !error ? (
              <div className="space-y-4">
                <div className="bg-white border border-fog rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <SearchX className="w-5 h-5 text-river mt-0.5 flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                    <div>
                      <h3 className="font-semibold text-taiga">Подходящих поездок пока нет</h3>
                      <p className="text-sm text-frost-dark mt-0.5">
                        Оставьте заявку ниже или посмотрите другие рейсы.
                      </p>
                    </div>
                  </div>
                  <Link href="/" className="btn-secondary flex-shrink-0 whitespace-nowrap">
                    Все поездки
                  </Link>
                </div>
                <DemandRequestForm defaultFromName={from} defaultToName={to} />
              </div>
            ) : trips.length > 0 ? (
              <div
                className="bg-white border border-fog rounded-xl divide-y divide-fog overflow-hidden"
                role="list"
                aria-label="Результаты поиска"
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
                            <span className="font-utility font-bold text-lg text-taiga leading-none">
                              {timeLabel(trip.departureTime)}
                            </span>
                            <span className="text-xs text-frost-dark">{dayLabel(trip.date)}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-utility font-bold text-lg text-taiga leading-none">{trip.legPrice} ₽</span>
                            <span className="text-xs text-frost-dark ml-1 font-utility">· {trip.legKm} км</span>
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
                            <span className="font-medium text-taiga truncate">
                              {trip.driver.firstName}{trip.driver.lastName ? ` ${trip.driver.lastName}` : ""}
                            </span>
                            {trip.driver.verified && (
                              <ShieldCheck
                                className="w-3.5 h-3.5 text-river flex-shrink-0"
                                strokeWidth={2}
                                aria-label="Проверен"
                              />
                            )}
                            <span className="inline-flex items-center gap-0.5 text-taiga font-utility">
                              <Star className="w-3 h-3 text-birch fill-birch" />
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
                          <div className="font-utility font-bold text-xl leading-none text-taiga">
                            {timeLabel(trip.departureTime)}
                          </div>
                          <div className="text-xs text-frost-dark mt-1">{dayLabel(trip.date)}</div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-taiga truncate">
                            {trip.originName} → {trip.destName}
                          </div>
                          <div className="flex items-center gap-x-2 gap-y-0.5 text-sm text-frost-dark mt-1 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 font-medium text-taiga">
                              <span className="avatar avatar-xs text-[10px]">{trip.driver.firstName.charAt(0)}</span>
                              {trip.driver.firstName}{trip.driver.lastName ? ` ${trip.driver.lastName}` : ""}
                            </span>
                            {trip.driver.verified && (
                              <span className="inline-flex items-center gap-1 text-xs text-river font-medium">
                                <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
                                Проверен
                              </span>
                            )}
                            <span className="text-fog">·</span>
                            <span className="font-utility text-taiga inline-flex items-center gap-1 text-xs">
                              <Star className="w-3.5 h-3.5 text-birch fill-birch" strokeWidth={0} aria-hidden="true" />
                              {(trip.driver.ratingAsDriver || 5).toFixed(1)}
                            </span>
                            {trip.driver.carModel && (
                              <>
                                <span className="text-fog">·</span>
                                <span className="text-xs">{trip.driver.carModel}</span>
                              </>
                            )}
                          </div>
                          {trip.comment && (
                            <p className="text-xs text-frost-dark mt-1 line-clamp-1">«{trip.comment}»</p>
                          )}
                        </div>

                        <div className="text-right flex-shrink-0 min-w-[110px]">
                          <div className="font-utility font-bold text-xl leading-none text-taiga">{trip.legPrice} ₽</div>
                          <div className="text-xs text-frost-dark mt-1 font-utility">
                            {trip.legKm} км · {trip.seatsLeft}/{trip.seatsTotal} мест
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
            ) : null}
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
