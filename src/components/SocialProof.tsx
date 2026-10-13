"use client";

import { motion, useReducedMotion } from "motion/react";
import { MapPin, Car, Users, Star } from "lucide-react";
import type { LandingStats } from "@/app/page";

export default function SocialProof({ stats }: { stats: LandingStats }) {
  const reduce = useReducedMotion();

  const items: Array<{ value: string; label: string; icon: typeof MapPin }> = [
    { value: String(stats.routes), label: stats.routes === 1 ? "маршрут" : "маршрутов", icon: MapPin },
    { value: String(stats.drivers), label: stats.drivers === 1 ? "водитель" : "водителей", icon: Car },
    { value: String(stats.points), label: "остановок города", icon: Users },
  ];

  if (stats.rating !== null) {
    items.push({ value: stats.rating.toFixed(1), label: "средний рейтинг", icon: Star });
  }

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="py-10 md:py-14 border-y border-fog"
      aria-label="Статистика сервиса"
    >
      <div className="container">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 md:gap-x-10 text-sm md:text-base font-utility text-frost-dark">
          {items.map((item, index) => (
            <motion.span
              key={item.label}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06, duration: 0.4 }}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <item.icon className="w-4 h-4 text-river" strokeWidth={1.5} aria-hidden="true" />
              <span className="font-display font-bold text-taiga">{item.value}</span>
              <span>{item.label}</span>
            </motion.span>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
