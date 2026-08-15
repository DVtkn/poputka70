"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Car, Bus } from "lucide-react";

type UserRole = "passenger" | "driver";

export function RoleSelector({ onRoleSelected }: { onRoleSelected: (role: UserRole) => void }) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-snow flex items-center justify-center">
        <div className="skeleton w-32 h-8"></div>
      </div>
    );
  }

  const handleSelect = (role: "passenger" | "driver") => {
    localStorage.setItem("userRole", role);
    onRoleSelected(role);
  };

  return (
    <div className="min-h-screen bg-snow flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-xl"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-white/90 border border-fog rounded-full px-4 py-1.5 text-sm font-medium text-frost mb-6 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-river animate-pulse" aria-hidden="true" />
            <span>Попутка70</span>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="font-display text-4xl md:text-5xl font-bold leading-[1.05] tracking-[-0.02em] mb-4 text-balance"
          >
            Как ты хочешь<br />
            <span className="gradient-text-river">путешествовать?</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-frost text-lg max-w-xl mx-auto leading-relaxed"
          >
            Выбери свою роль — мы покажем только то, что тебе нужно
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="grid md:grid-cols-2 gap-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card
              variant="outlined"
              className="cursor-pointer p-8 h-full hover:bg-fog/50 hover:border-river/30 transition-all duration-300 group"
              onClick={() => handleSelect("passenger")}
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform duration-300">
                  <Bus className="w-8 h-8 text-river" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-xl font-semibold mb-2">Пассажир</h3>
                <p className="text-frost text-sm mb-6 leading-relaxed">
                  Ищу попутку, хочу сэкономить время и деньги. Еду по маршруту, который уже проезжает водитель.
                </p>
                <ul className="space-y-2 text-sm text-frost text-left mb-6">
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-river" /> Дешевле такси в 2–3 раза</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-river" /> Не жду автобус 40 минут</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-river" /> Проверенные водители с рейтингом</li>
                </ul>
                <Button className="w-full" size="lg">Выбрать пассажира</Button>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Card
              variant="outlined"
              className="cursor-pointer p-8 h-full hover:bg-fog/50 hover:border-river/30 transition-all duration-300 group"
              onClick={() => handleSelect("driver")}
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-birch/10 flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform duration-300">
                  <Car className="w-8 h-8 text-birch" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-xl font-semibold mb-2">Водитель</h3>
                <p className="text-frost text-sm mb-6 leading-relaxed">
                  Еду сам, могу взять попутчиков. Хочу окупить топливо и помочь людям добраться быстрее.
                </p>
                <ul className="space-y-2 text-sm text-frost text-left mb-6">
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-birch" /> Окупай до 70% топлива</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-birch" /> Ездишь когда хочешь, без графика</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-birch" /> Выбираешь пассажиров по рейтингу</li>
                </ul>
                <Button className="w-full" variant="secondary" size="lg">Стать водителем</Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center text-xs text-frost mt-8"
        >
          Можно сменить роль в любой момент в настройках профиля
        </motion.p>
      </motion.div>
    </div>
  );
}