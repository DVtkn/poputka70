"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { MapPin, ChevronRight, Star, Car, Shield, RefreshCw } from "lucide-react";
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

function formatDate(value: string): string {
  const date = new Date(value);
  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

export default function RouteList() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reduce = useReducedMotion();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/routes");
      const data = (await res.json().catch(() => null)) as { success?: boolean; routes?: Route[] } | null;
      if (!res.ok || !data?.success) {
        setError(apiError(data, "Не удалось загрузить маршруты").message);
        return;
      }
      setError("");
      setRoutes(data.routes ?? []);
    } catch {
      setError("Ошибка сети. Обнови страницу.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const initialLoad = async () => {
      try {
        const res = await fetch("/api/routes");
        const data = (await res.json().catch(() => null)) as { success?: boolean; routes?: Route[] } | null;
        if (!active) return;
        if (!res.ok || !data?.success) {
          setError(apiError(data, "Не удалось загрузить маршруты").message);
          return;
        }
        setRoutes(data.routes ?? []);
      } catch {
        if (active) setError("Ошибка сети. Обнови страницу.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void initialLoad();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div className="skeleton h-9 w-56" />
          <div className="skeleton h-6 w-24 rounded-full" />
        </div>
        <div className="space-y-4">
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
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="card p-10 md:p-14 text-center">
          <h2 className="text-h3 mb-2">Не получилось загрузить маршруты</h2>
          <p className="text-frost-dark mb-6">{error}</p>
          <button onClick={() => void load()} className="btn-secondary inline-flex">
            <RefreshCw className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="container">
        <div className="card p-10 md:p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-4">
            <Car className="w-8 h-8 text-river" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <h2 className="text-h3 mb-3">Стань первым водителем</h2>
          <p className="text-frost-dark mb-6 max-w-sm mx-auto leading-relaxed">
            Пока нет активных маршрутов. Создай первый — пассажиры уже ждут.
          </p>
          <Link href="/driver" className="btn-primary inline-flex">
            Создать маршрут
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="flex items-center justify-between mb-8 md:mb-10">
        <h2 className="text-h2">Доступные маршруты</h2>
        <span className="badge badge-river font-utility">
          {routes.length} {routes.length === 1 ? "маршрут" : "активных"}
        </span>
      </div>

      <div className="space-y-4" role="list" aria-label="Список маршрутов">
        {routes.map((route, index) => (
          <motion.div
            key={route.id}
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            role="listitem"
          >
            <Link
              href={`/routes/${route.id}`}
              className="card card-hover block p-5 md:p-6 group"
            >
              <div className="flex items-start gap-4">
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
                  <div className="flex items-center gap-x-3 gap-y-1 text-sm text-frost-dark mt-1 flex-wrap">
                    <span className="font-utility text-birch-dark flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-current" strokeWidth={0} aria-hidden="true" />
                      {(route.driver.ratingAsDriver || 5).toFixed(1)}
                    </span>
                    <span aria-hidden="true">•</span>
                    <span>{route.driver.car}</span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="font-utility font-bold text-2xl md:text-3xl text-taiga">{route.price} ₽</div>
                  <div className="text-xs text-frost-dark">за место</div>
                </div>

                <ChevronRight
                  className="w-5 h-5 text-fog group-hover:text-river group-hover:translate-x-1 transition-all duration-300 flex-shrink-0 mt-1"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </div>

              <div className="mt-5 pt-5 border-t border-fog/50 flex items-center gap-x-4 gap-y-2 flex-wrap">
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
                  <div className="text-caption text-frost-dark mb-2">Ближайшие рейсы</div>
                  <div className="space-y-2">
                    {route.nextTrips.slice(0, 3).map((trip) => (
                      <div
                        key={trip.id}
                        className="flex items-center justify-between gap-3 bg-snow rounded-xl p-3 border border-fog/50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-utility font-bold text-sm whitespace-nowrap">
                            {formatDate(trip.date)}
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
                            <span className="text-sm text-ember font-medium whitespace-nowrap">Мест нет</span>
                          )}
                          <StatusBadge status={trip.status} type="trip" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
