"use client";

import { motion, useReducedMotion } from "motion/react";
import { Shield, Wallet, Clock, Star } from "lucide-react";

const benefits = [
  { icon: Shield, title: "Проверенные водители", desc: "Водитель проходит верификацию документов и получает бейдж «Проверен»." },
  { icon: Wallet, title: "В 2–3 раза дешевле такси", desc: "Платишь только за своё место, а не за весь автомобиль." },
  { icon: Clock, title: "Без ожидания", desc: "Водитель уже едет по маршруту — просто выбери время." },
  { icon: Star, title: "Честные отзывы", desc: "Оценки только от тех, кто реально ехал. Никакого фейка." },
];

export default function WhyItWorks() {
  const reduce = useReducedMotion();

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="mb-20 bg-taiga text-white"
    >
      <div className="container py-16 md:py-24">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.02em] mb-3">
            Почему выбирают Попутку
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto leading-relaxed">
            Четыре причины довериться поездкам с нами
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={reduce ? false : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-xl p-6 md:p-8 text-center bg-white/5 border border-white/10 transition-colors hover:border-white/20"
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <benefit.icon className="w-6 h-6 text-birch" strokeWidth={1.5} aria-hidden="true" />
              </div>
              <h3 className="font-display text-lg md:text-xl font-semibold mb-2">{benefit.title}</h3>
              <p className="text-white/70 text-sm leading-relaxed">{benefit.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
