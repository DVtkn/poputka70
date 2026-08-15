"use client";

import { Icon } from "./Icon";

type Step = {
  number: number;
  title: string;
  description: string;
  icon: string;
};

type StepsProps = {
  steps: Step[];
  className?: string;
};

export default function Steps({ steps, className = "" }: StepsProps) {
  return (
    <div
      className={`relative ${className}`}
      role="list"
      aria-label="Как работает сервис"
    >
      <div className="hidden lg:block absolute left-1/2 top-12 -translate-x-1/2 w-px h-[calc(100%-24px)] bg-gradient-to-b from-river/20 via-transparent to-transparent" aria-hidden="true" />
      <div className="relative space-y-12 md:space-y-16">
        {steps.map((step, index) => (
          <div
            key={step.number}
            className={`relative flex flex-col md:flex-row items-center gap-8 animate-fade-in-up ${index % 2 === 1 ? "md:flex-row-reverse" : ""}`}
            style={{ animationDelay: `${index * 150}ms` }}
            role="listitem"
          >
            <div className="relative z-10 flex-shrink-0 w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-river/5 border border-river/20 flex items-center justify-center">
              <span className="font-display text-4xl md:text-5xl font-bold text-river">{step.number}</span>
            </div>
            <div className={`flex-1 ${index % 2 === 1 ? "text-right" : ""}`}>
              <div className="inline-flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-birch uppercase tracking-wider">Шаг {step.number}</span>
                <div className="w-12 h-px bg-birch" aria-hidden="true" />
              </div>
              <h3 className="font-display text-2xl md:text-3xl font-bold text-taiga mb-3">{step.title}</h3>
              <p className="text-frost text-lg leading-relaxed">{step.description}</p>
            </div>
            <div className="relative z-10 flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-birch-pale flex items-center justify-center" aria-hidden="true">
              <Icon name={step.icon} size={32} className="text-birch" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}