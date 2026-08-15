"use client";

import { Icon } from "./Icon";

type StatItem = {
  value: string | number;
  label: string;
  icon?: string;
};

type StatsProps = {
  items: StatItem[];
  className?: string;
};

export default function Stats({ items, className = "" }: StatsProps) {
  return (
    <div
      className={`grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 ${className}`}
      role="list"
      aria-label="Статистика сервиса"
    >
      {items.map((item, index) => (
        <div
          key={index}
          className="text-center animate-fade-in-up stagger-1"
          style={{ animationDelay: `${index * 100}ms` }}
          role="listitem"
        >
          {item.icon && (
            <div className="inline-flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-xl bg-birch-pale text-birch" aria-hidden="true">
              <Icon name={item.icon} size={24} />
            </div>
          )}
          <div className="font-display text-3xl md:text-4xl font-bold text-taiga" aria-label={`${item.value} ${item.label}`}>
            {item.value}
          </div>
          <div className="text-sm text-frost mt-1">{item.label}</div>
        </div>
      ))}
    </div>
  );
}