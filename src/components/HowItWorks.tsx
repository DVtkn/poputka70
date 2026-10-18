import Link from "next/link";
import { MapPin, Send, Car } from "lucide-react";

const STEPS = [
  { icon: MapPin, title: "Найди попутку", text: "Введи откуда и куда: покажем поездки соседей в твою сторону." },
  { icon: Send, title: "Запроси место", text: "Выбери остановку по пути. Водитель примет заявку одним касанием." },
  { icon: Car, title: "Поехали", text: "Встречаетесь на остановке. Платишь водителю напрямую." },
];

export default function HowItWorks() {
  return (
    <section className="section-sm content-auto">
      <div className="container">
        <div className="flex items-end justify-between gap-4 mb-6">
          <h2 className="text-h2">Как это работает</h2>
          <Link href="/how-it-works" className="text-sm font-semibold text-river hover:underline">
            Подробнее
          </Link>
        </div>

        <div className="card grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-fog overflow-hidden">
          {STEPS.map((step) => (
            <div key={step.title} className="p-6">
              <div className="w-9 h-9 rounded-lg bg-river-light text-river flex items-center justify-center mb-4">
                <step.icon className="w-[18px] h-[18px]" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="text-h3 mb-1.5">{step.title}</h3>
              <p className="text-sm text-frost-dark leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
