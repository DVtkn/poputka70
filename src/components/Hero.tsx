"use client";

import { motion } from "motion/react";
import SearchForm from "./SearchForm";

export default function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative pt-16 pb-12 md:pt-24 md:pb-16 lg:pt-32 lg:pb-20"
    >
      <div className="container relative">
        <div className="max-w-3xl mx-auto text-center mb-10 md:mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/90 border border-fog rounded-full px-4 py-1.5 text-sm font-medium text-frost mb-6 backdrop-blur-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-river animate-pulse" aria-hidden="true" />
            Попутки по Томску
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-[-0.02em] mb-5 text-balance"
          >
            Едешь по городу —
            <br />
            <span className="gradient-text-river">возьми соседа.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-frost text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
          >
            Попутки соседей по Томску. Платишь водителю напрямую — платформа бесплатна.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="relative"
        >
          <div className="bg-white rounded-2xl border border-fog shadow-xl p-6 md:p-8">
            <SearchForm />
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}