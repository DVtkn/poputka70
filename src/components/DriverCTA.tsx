"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Wallet, Clock, Users, ShieldCheck, ArrowRight } from "lucide-react";
import { RouteLine } from "@/components/ui/RouteLine";

const benefits = [
  { icon: Wallet, title: "Окупай топливо", desc: "Пассажиры делят расходы на поездку, а не платят тариф" },
  { icon: Clock, title: "Езди когда хочешь", desc: "Маршрут создаётся за минуту. Никаких графиков" },
  { icon: Users, title: "Свои пассажиры", desc: "Пассажиры видят твой рейтинг и подтверждённые поездки" },
  { icon: ShieldCheck, title: "Бейдж «Проверен»", desc: "После верификации документов — больше доверия и броней" },
];

export default function DriverCTA() {
  const reduce = useReducedMotion();

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="mb-16 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-river via-river/90 to-taiga" aria-hidden="true" />

      <div className="container relative py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-[-0.02em] mb-4 text-white leading-[1.1]">
              Ездишь одним маршрутом каждый день?
            </h2>
            <p className="text-white/70 mb-8 text-lg leading-relaxed max-w-md">
              Пустые места превращаются в компенсацию расходов. Бесплатно для водителей.
            </p>

            <ul className="space-y-3 mb-8" role="list">
              {benefits.map((benefit, index) => (
                <motion.li
                  key={benefit.title}
                  initial={reduce ? false : { opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + index * 0.06, duration: 0.4 }}
                  className="flex gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <benefit.icon className="w-6 h-6 text-birch flex-shrink-0 mt-0.5" strokeWidth={1.5} aria-hidden="true" />
                  <div>
                    <strong className="text-white block">{benefit.title}</strong>
                    <span className="text-white/60 text-sm">{benefit.desc}</span>
                  </div>
                </motion.li>
              ))}
            </ul>

            <Link href="/driver" className="btn-white inline-flex group">
              <span>Стать водителем</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2} aria-hidden="true" />
            </Link>
            <p className="mt-5 text-white/40 text-xs">
              Регистрация бесплатная • Отключить маршрут можно в любой момент
            </p>
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="rounded-3xl p-1 bg-white/10">
              <div className="rounded-[20px] bg-taiga/60 border border-white/10 p-8">
                <div className="text-caption text-white/50 mb-6">Пример маршрута</div>
                <RouteLine from="Каштак" to="Площадь Ленина" animated />
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <div className="font-utility font-bold text-2xl text-white">08:00</div>
                    <div className="text-xs text-white/50 mt-1">выезд каждый будний день</div>
                  </div>
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <div className="font-utility font-bold text-2xl text-white">3 места</div>
                    <div className="text-xs text-white/50 mt-1">свободно в машине</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
