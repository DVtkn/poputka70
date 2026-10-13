"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Car, MapPin, Users } from "lucide-react";
import type { LandingStats } from "@/app/page";

export default function CtaBanner({ stats }: { stats: LandingStats }) {
  const reduce = useReducedMotion();

  const numbers = [
    { icon: Car, label: `${stats.routes}`, sub: stats.routes === 1 ? "маршрут" : "маршрутов" },
    { icon: Users, label: `${stats.drivers}`, sub: stats.drivers === 1 ? "водитель" : "водителей" },
    { icon: MapPin, label: `${stats.points}`, sub: "точек по городу" },
  ];

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="pb-16 md:pb-24"
    >
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl bg-taiga text-white">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-river/30 blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-birch/20 blur-3xl" aria-hidden="true" />

          <div className="relative grid lg:grid-cols-2 gap-10 lg:gap-16 items-center p-8 md:p-12 lg:p-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-4 py-1.5 text-sm font-medium text-white/70 mb-6">
                <MapPin className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
                Томск
              </div>
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-[-0.02em] mb-4 leading-[1.1]">
                Твоя первая попутка — <span className="gradient-text-birch">уже сегодня</span>
              </h2>
              <p className="text-white/60 text-lg mb-8 leading-relaxed max-w-md">
                Найди маршрут до учёбы, работы или вокзала за 15 секунд. Для поиска регистрация не нужна.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/search" className="btn-white inline-flex group" aria-label="Найти попутку">
                  Найти попутку
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2} aria-hidden="true" />
                </Link>
                <Link
                  href="/driver"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[56px] text-base font-medium rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors"
                  aria-label="Стать водителем"
                >
                  <Car className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
                  Стать водителем
                </Link>
              </div>
            </div>

            <div className="hidden lg:grid grid-cols-3 gap-4" aria-hidden="true">
              {numbers.map((item, index) => (
                <motion.div
                  key={item.sub}
                  initial={reduce ? false : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                  className="rounded-2xl p-5 text-center bg-white/5 border border-white/10"
                >
                  <item.icon className="w-6 h-6 text-birch mx-auto mb-3" strokeWidth={1.5} />
                  <div className="font-display font-bold text-xl text-white">{item.label}</div>
                  <div className="text-xs text-white/50 mt-1">{item.sub}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
