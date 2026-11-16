import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Star } from "lucide-react";
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
  return (
    <section className="pt-5 sm:pt-7 md:pt-9 pb-4 md:pb-6">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-4 md:mb-5">
          <h1 className="font-display font-bold tracking-tight text-taiga text-2xl sm:text-3xl md:text-[2rem] leading-[1.12] text-balance">
            Поездки по Томску
          </h1>

          {stats.trips > 0 && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-frost-dark font-utility flex-shrink-0 pb-0.5">
              <span>
                <b className="text-taiga">{stats.trips}</b>{" "}
                {plural(stats.trips, ["активная поездка", "активные поездки", "активных поездок"])}
              </span>
              {stats.drivers > 0 && (
                <>
                  <span className="text-fog">·</span>
                  <span>
                    <b className="text-taiga">{stats.drivers}</b>{" "}
                    {plural(stats.drivers, ["водитель", "водителя", "водителей"])}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border border-fog rounded-xl p-3.5 sm:p-5 shadow-xs">
          <Suspense fallback={<div className="skeleton h-24 w-full" />}>
            <SearchForm />
          </Suspense>
        </div>

        {nextTrip && (
          <Link
            href={`/trips/${nextTrip.id}`}
            className="mt-3 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white border border-fog hover:border-river/40 transition-colors text-sm"
          >
            <div className="flex items-center gap-3 min-w-0 flex-wrap">
              <span className="text-xs font-medium text-frost-dark">Ближайший выезд</span>
              <span className="font-utility font-bold text-taiga">
                {nextTrip.timeLabel} · {nextTrip.dayLabel}
              </span>
              <span className="font-semibold text-taiga truncate">
                {nextTrip.originName} → {nextTrip.destName}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-frost-dark">
                {nextTrip.driverName}
                {nextTrip.driverVerified && (
                  <ShieldCheck className="w-3.5 h-3.5 text-river" strokeWidth={2} aria-label="Проверен" />
                )}
                ·
                <Star className="w-3 h-3 text-birch fill-birch" aria-hidden="true" />
                {nextTrip.rating.toFixed(1)}
              </span>
            </div>

            <div className="flex items-center gap-3 ml-auto flex-shrink-0">
              <span className="font-utility font-bold text-taiga">{nextTrip.price} ₽</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-river">
                Открыть
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
              </span>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}
