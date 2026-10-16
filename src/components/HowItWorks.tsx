"use client";

import { motion, useReducedMotion } from "motion/react";
import { MapPin, Zap, Star } from "lucide-react";

const steps = [
  { icon: MapPin, title: "Найди попутку", desc: "Введи откуда и куда — покажем поездки соседей в твою сторону." },
  { icon: Zap, title: "Запроси место", desc: "Водитель получит заявку и примет её одним касанием." },
  { icon: Star, title: "Поехали", desc: "Встречаетесь на остановке, платишь водителю напрямую." },
];

export default function HowItWorks() {
  const reduce = useReducedMotion();

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="mb-20"
    >
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-h2 mb-3">Как это работает</h2>
          <p className="text-frost-dark text-lg max-w-2xl mx-auto leading-relaxed">Три шага — и ты уже в пути</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={reduce ? false : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="card p-6 md:p-8 text-center group"
            >
              <div className="w-14 h-14 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform">
                <step.icon className="w-7 h-7 text-river" strokeWidth={1.5} aria-hidden="true" />
              </div>
              <h3 className="text-h3 mb-2">{step.title}</h3>
              <p className="text-frost-dark leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
