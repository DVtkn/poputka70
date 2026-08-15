"use client";

import { motion } from "motion/react";
import { MapPin, Car, Users, Star, Shield } from "lucide-react";

const stats = [
  { value: "120+", label: "маршрутов", icon: MapPin },
  { value: "50+", label: "водителей", icon: Car },
  { value: "15", label: "точек", icon: Users },
  { value: "4.9", label: "рейтинг", icon: Star },
  { value: "100%", label: "проверенных", icon: Shield },
];

export default function SocialProof() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="py-10 md:py-14 border-y border-fog"
      aria-label="Статистика сервиса"
    >
      <div className="container">
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-sm md:text-base font-utility text-frost">
          {stats.map((s, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <s.icon className="w-4 h-4 text-river" strokeWidth={1.5} aria-hidden="true" />
              <span className="font-display font-bold text-taiga">{s.value}</span>
              <span>{s.label}</span>
              {i < stats.length - 1 && <span className="hidden md:inline text-fog">·</span>}
            </motion.span>
          ))}
        </div>
      </div>
    </motion.section>
  );
}