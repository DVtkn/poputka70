"use client";

import { motion, useReducedMotion } from "motion/react";
import { MapPin, ShieldCheck, Star, Wallet } from "lucide-react";

const ITEMS = [
  { icon: Wallet, title: "Платишь водителю", text: "Цена видна до заявки и уходит водителю напрямую." },
  { icon: MapPin, title: "Посадка по пути", text: "Любая остановка вдоль маршрута, не нужно ехать в центр." },
  { icon: ShieldCheck, title: "Проверенные водители", text: "Рейтинг, отзывы и бейдж «Проверен» после верификации." },
  { icon: Star, title: "Честные отзывы", text: "Оставляют только те, кто действительно ехал." },
];

export default function WhyItWorks() {
  const reduce = useReducedMotion();

  return (
    <section className="section-sm">
      <div className="container">
        <h2 className="text-h2 mb-6">Почему это работает</h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
          {ITEMS.map((item, index) => (
            <motion.div
              key={item.title}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
            >
              <div className="w-9 h-9 rounded-lg bg-white border border-fog text-river flex items-center justify-center mb-3">
                <item.icon className="w-4.5 h-4.5" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-frost-dark leading-relaxed">{item.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
