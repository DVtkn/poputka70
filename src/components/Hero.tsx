"use client";

import { Suspense } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, MapPin, ShieldCheck, Star } from "lucide-react";
import SearchForm from "@/components/SearchForm";
import { plural } from "@/lib/utils";

export interface HeroStats {
  trips: number;
  drivers: number;
  stops: number;
}

export interface HeroTrip {
  id: string;
  timeLabel: string;
  dayLabel: string;
  originName: string;
  destName: string;
  price: number;
  seatsLeft: number;
  seatsTotal: number;
  driverName: string;
  driverVerified: boolean;
  rating: number;
  carModel: string | null;
}

export default function Hero({ stats, nextTrip }: { stats: HeroStats; nextTrip: HeroTrip | null }) {
  const reduce = useReducedMotion();
  const fade = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <section className="pt-8 md:pt-14 pb-6 md:pb-10">
      <div className="container">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-14 items-start">
          <motion.div {...fade(0)}>
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-fog px-3.5 py-1.5 text-xs font-semibold text-frost-dark mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-river" aria-hidden="true" />
              Попутки Томска
            </div>

            <h1 className="text-display text-taiga mb-4">
              Едешь по городу:
              <br />
              <span className="text-river">возьми соседа.</span>
            </h1>

            <p className="text-frost-dark text-[17px] leading-relaxed max-w-md mb-6">
              Соседи делят дорогу и бензин. Найди попутку или подвези сам. Бесплатно.
            </p>

            <div className="flex items-center gap-3 text-sm text-frost-dark font-utility">
              <span><b className="text-taiga">{stats.trips}</b> {plural(stats.trips, ["попутка", "попутки", "попуток"])}</span>
              <span className="w-px h-4 bg-fog" aria-hidden="true" />
              <span><b className="text-taiga">{stats.drivers}</b> {plural(stats.drivers, ["водитель", "водителя", "водителей"])}</span>
              <span className="w-px h-4 bg-fog" aria-hidden="true" />
              <span><b className="text-taiga">{stats.stops}</b> {plural(stats.stops, ["остановка", "остановки", "остановок"])}</span>
            </div>
          </motion.div>

          <motion.aside {...fade(0.1)} className="hidden lg:block">
            {nextTrip ? (
              <Link href={`/trips/${nextTrip.id}`} className="card card-hover block p-6">
                <div className="text-caption mb-3">Ближайшая попутка</div>

                <div className="flex items-baseline gap-3 mb-4">
                  <span className="font-utility text-3xl font-bold leading-none">{nextTrip.timeLabel}</span>
                  <span className="text-sm text-frost-dark">{nextTrip.dayLabel}</span>
                </div>

                <div className="space-y-2 mb-5">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-river flex-shrink-0" aria-hidden="true" />
                    {nextTrip.originName}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-birch flex-shrink-0" aria-hidden="true" />
                    {nextTrip.destName}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-fog gap-3">
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <span className="avatar avatar-sm">{nextTrip.driverName.charAt(0)}</span>
                    <span className="font-medium truncate">{nextTrip.driverName}</span>
                    {nextTrip.driverVerified && (
                      <ShieldCheck className="w-4 h-4 text-birch flex-shrink-0" strokeWidth={2} aria-label="Проверен" />
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-utility text-xl font-bold leading-none">{nextTrip.price} ₽</div>
                    <div className="text-[11px] text-frost-dark mt-1">за место</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-frost-dark">
                  <span className="inline-flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-birch fill-birch" aria-hidden="true" />
                    {nextTrip.rating.toFixed(1)}
                    {nextTrip.carModel ? ` · ${nextTrip.carModel}` : ""}
                    {" · "}
                    свободно {nextTrip.seatsLeft} из {nextTrip.seatsTotal}
                  </span>
                  <span className="inline-flex items-center gap-1 text-river font-semibold">
                    Открыть
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ) : (
              <div className="card p-6">
                <div className="w-11 h-11 rounded-xl bg-river-light flex items-center justify-center mb-4">
                  <MapPin className="w-5 h-5 text-river" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <h2 className="text-h3 mb-2">Попуток пока нет</h2>
                <p className="text-sm text-frost-dark mb-5">
                  Опубликуй поездку: пассажиры попросят место, а ты решишь, кого взять.
                </p>
                <Link href="/driver" className="btn-primary w-full">Опубликовать поездку</Link>
              </div>
            )}
          </motion.aside>
        </div>

        <motion.div {...fade(0.15)} className="mt-8">
          <div className="card p-4 md:p-5">
            <Suspense fallback={<div className="skeleton h-24 w-full" />}>
              <SearchForm />
            </Suspense>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
