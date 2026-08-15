"use client";

import { motion } from "motion/react";
import { MapPin, Zap, Star } from "lucide-react";

const steps = [
  { icon: MapPin, title: "Выбери маршрут", desc: "Откуда и куда — покажем все попутки по пути." },
  { icon: Zap, title: "Забронируй", desc: "Оплати место за секунду. Водитель уже в курсе." },
  { icon: Star, title: "Поехали", desc: "Встреться в точке. Дешевле такси, быстрее автобуса." },
];

export default function HowItWorks() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="mb-20"
    >
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.02em] mb-3">Как это работает</h2>
          <p className="text-frost text-lg max-w-2xl mx-auto leading-relaxed">Три шага — и ты уже едешь</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="card p-6 md:p-8 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform">
                <step.icon className="w-7 h-7 text-river" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-xl md:text-2xl font-semibold mb-2">{step.title}</h3>
              <p className="text-frost leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}