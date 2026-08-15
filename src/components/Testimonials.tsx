"use client";

import { motion } from "motion/react";
import { TestimonialCard } from "@/components/ui/TestimonialCard";
import { Star } from "lucide-react";

const testimonials = [
  {
    id: "t1",
    author: "Анна К.",
    role: "студентка СибГМУ, ездит Солнечный → СибГМУ",
    content:
      "Раньше ждала троллейбус по 30–40 минут, а теперь просто выхожу в 8:10 и сажусь в знакомую машину. За зиму ни одного опоздания на пары.",
    rating: 5,
  },
  {
    id: "t2",
    author: "Дмитрий С.",
    role: "водитель, маршрут Каштак → Центр",
    content:
      "Езжу на работу каждый день, место в машине всё равно пустое. Теперь три попутчика почти полностью закрывают бензин. Сервис проверяет всех — спокойно.",
    rating: 5,
  },
  {
    id: "t3",
    author: "Павел З.",
    role: "программист, Академгородок",
    content:
      "Такси до Южных Ворот — 350 ₽, автобус — толпа. Попутка за 150 ₽ и 15 минут. Здесь всё по расписанию, как у автобуса, только быстрее и теплее.",
    rating: 5,
  },
  {
    id: "t4",
    author: "Мария В.",
    role: "маршрут Аэропорт → ТГУ",
    content:
      "Сначала боялась карпулинга. Но водитель прошёл проверку, я вижу рейтинг и фото авто. Езжу третью неделю — всё максимально аккуратно и вежливо.",
    rating: 5,
  },
  {
    id: "t5",
    author: "Игорь Т.",
    role: "водитель, маршрут Зелёные Горки → Ж/Д вокзал",
    content:
      "Получил бейдж «Проверен» после модерации — броней стало заметно больше. Люди доверяют, и это приятно. Сбор 15% честно окупает себя комфортом водителей.",
    rating: 5,
  },
  {
    id: "t6",
    author: "Ольга Н.",
    role: "менеджер, БЦ «Мегаполис»",
    content:
      "Поездка до офиса, которая раньше стоила как обед, теперь стоит 120 ₽. И главное — я знаю, на кого сажусь: имя, рейтинг, отзывы. Безопасно для девушки.",
    rating: 4,
  },
];

export default function Testimonials() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="py-16 md:py-24"
      aria-labelledby="testimonials-title"
    >
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-12 md:mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-birch-light-bg border border-birch/20 px-4 py-1.5 text-sm font-medium text-birch mb-5">
            <Star className="w-4 h-4 fill-current" strokeWidth={0} />
            Средний рейтинг 4.9 из 5
          </div>
          <h2 id="testimonials-title" className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-[-0.02em] mb-4">
            Томск уже едет <span className="gradient-text-birch">с попуткой</span>
          </h2>
          <p className="text-frost text-lg max-w-2xl mx-auto leading-relaxed">
            Реальные отзывы тех, кто каждый день делит дорогу с соседом
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" role="list">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              role="listitem"
              className="h-full"
            >
              <TestimonialCard testimonial={t} className="h-full" />
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}