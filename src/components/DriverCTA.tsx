"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Wallet, Clock, Users, Shield, ArrowRight, Car } from "lucide-react";

const benefits = [
  { icon: Wallet, title: "Окупай топливо", desc: "До 70% расходов на бензин с каждого пассажира" },
  { icon: Clock, title: "Езди когда хочешь", desc: "Маршрут создается за минуту. Никаких графиков" },
  { icon: Users, title: "Выбирай пассажиров", desc: "Смотри профили и отзывы. Подтверждай удобных" },
  { icon: Shield, title: "Полная безопасность", desc: "Страховка, автооплата, поддержка 24/7" },
];

export default function DriverCTA() {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.98 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="mb-16 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-river via-river/90 to-taiga" aria-hidden="true" />
      
      <div className="container relative py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-xl"
          >
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-[-0.02em] mb-4 text-white">
              Ездишь этим маршрутом каждый день?
            </h2>
            <p className="text-white/70 mb-8 text-lg leading-relaxed max-w-md">
              Пустые места превращаются в доход. Бесплатно, без рисков, на твоих условиях.
            </p>

            <ul className="space-y-3 mb-8" role="list">
              {benefits.map((benefit, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.06, duration: 0.4 }}
                  className="flex gap-3 p-3 rounded-xl group"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <benefit.icon
                    className="w-6 h-6 text-birch flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform"
                    strokeWidth={1.5}
                  />
                  <div>
                    <strong className="text-white block">{benefit.title}</strong>
                    <span className="text-white/60 text-sm">{benefit.desc}</span>
                  </div>
                </motion.li>
              ))}
            </ul>

            <Link
              href="/driver"
              className="btn-white inline-flex group"
            >
              <span>Стать водителем</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2} />
            </Link>
            <p className="mt-5 text-white/40 text-xs">Никаких комиссий за регистрацию • Отмена в любой момент</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden lg:block relative"
          >
            <div className="aspect-square max-w-md mx-auto bg-gradient-to-br from-white/10 to-white/5 rounded-3xl p-1">
              <div className="w-full h-full bg-taiga/50 rounded-2xl flex items-center justify-center border border-white/10">
                <Car className="w-3/4 h-3/4 text-white/30" strokeWidth={1} />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}