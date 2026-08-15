"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { MapPin, ChevronRight, Star, Car, Shield } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";

type Trip = { id: string; date: string; departureTime: string; status: string; availableSeats: number; totalSeats: number; };
type Route = { id: string; from: string; to: string; time: string; price: number; seats: number; days: string; driver: { id: string; name: string; car: string; carColor: string; verified: boolean; ratingAsDriver: number; }; nextTrips: Trip[]; };

export default function RouteList() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/routes")
      .then(r => r.json())
      .then(d => { if (d.success) setRoutes(d.routes || []); else setError(d.error || "Ошибка загрузки"); })
      .catch(() => setError("Ошибка сети"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="skeleton h-9 w-48" />
        <div className="skeleton h-5 w-20" />
      </div>
      <div className="space-y-4">
        {[1,2,3].map(i => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, duration: 0.5 }}>
            <div className="card p-5">
              <div className="flex items-center gap-4">
                <div className="skeleton w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-5 w-3/4" />
                  <div className="skeleton h-4 w-1/2" />
                </div>
                <div className="skeleton h-10 w-24" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  if (routes.length === 0) return (
    <div className="card p-10 md:p-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-4">
        <Car className="w-8 h-8 text-river" strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-2xl md:text-3xl font-bold mb-3">Стань первым водителем</h3>
      <p className="text-frost mb-6 max-w-sm mx-auto leading-relaxed">Пока нет маршрутов в твоём районе. Создай первый — пассажиры уже ждут.</p>
      <Link href="/driver" className="btn-primary inline-flex">Создать маршрут</Link>
    </div>
  );

  const formatDate = (ds: string) => { const d = new Date(ds); const m = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"]; return d.getDate() + " " + m[d.getMonth()]; };

  return (
    <motion.section
      id="routes"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="mb-20"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex items-center justify-between mb-10"
      >
        <h2 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.02em]">Доступные маршруты</h2>
        <span className="badge badge-river font-utility">{routes.length} активных</span>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-ember/10 border border-ember/20 rounded-xl p-4 text-ember text-sm mb-8"
        >
          {error}
        </motion.div>
      )}

      <div className="space-y-4" role="list" aria-label="Список маршрутов">
        {routes.map((route, idx) => (
          <motion.div
            key={route.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            role="listitem"
          >
            <Link
              href={"/routes/" + route.id}
              className="card block p-5 md:p-6 group relative overflow-hidden transition-all duration-300 hover:border-river/30"
            >
              <div className="flex items-center gap-4">
                <div className="avatar avatar-lg flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
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
                    <span>{route.driver.car}</span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 min-w-[100px]">
                  <div className="font-utility font-bold text-2xl md:text-3xl text-taiga">{route.price} ₽</div>
                  <div className="text-xs text-frost">за место</div>
                </div>

                <ChevronRight
                  className="w-5 h-5 text-fog group-hover:text-river group-hover:translate-x-1 transition-all duration-300 flex-shrink-0"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </div>

              <div className="relative mt-5 pt-5 border-t border-fog/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5 text-sm text-taiga font-medium">
                      <MapPin className="w-4 h-4 text-birch" strokeWidth={2} />
                      <span className="truncate max-w-[200px]">{route.from}</span>
                    </div>
                    <div className="w-4 h-4 rounded-full bg-fog/50 flex-shrink-0" />
                    <div className="flex items-center gap-1.5 text-sm text-taiga font-medium">
                      <MapPin className="w-4 h-4 text-river" strokeWidth={2} />
                      <span className="truncate max-w-[200px]">{route.to}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-frost flex-wrap">
                    <span className="font-utility whitespace-nowrap">{route.time}</span>
                    <span className="text-fog">•</span>
                    <span>{route.days}</span>
                  </div>
                </div>
              </div>

              {route.nextTrips.length > 0 && (
                <div className="mt-5 pt-5 border-t border-fog/50">
                  <div className="text-xs text-frost uppercase tracking-wider font-semibold mb-3">Ближайшие рейсы</div>
                  <div className="space-y-2">
                    {route.nextTrips.slice(0, 3).map(trip => (
                      <div
                        key={trip.id}
                        className="flex items-center justify-between bg-white rounded-xl p-3 border border-fog/50 hover:border-river/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-utility font-bold text-sm whitespace-nowrap">{formatDate(trip.date)}</span>
                          <span className="font-utility text-frost whitespace-nowrap">{trip.departureTime}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {trip.availableSeats > 0 ? (
                            <span className="text-sm text-frost whitespace-nowrap">{trip.availableSeats}/{trip.totalSeats} мест</span>
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
    </motion.section>
  );
}