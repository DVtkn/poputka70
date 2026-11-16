import { MapPin, ShieldCheck, Star, Wallet } from "lucide-react";

const ITEMS = [
  { icon: Wallet, title: "Без комиссии", text: "Цена известна заранее и переводится водителю напрямую." },
  { icon: MapPin, title: "Остановки по пути", text: "Удобная точка посадки вдоль маршрута без заезда в центр." },
  { icon: ShieldCheck, title: "Проверка документов", text: "У проверенных водителей сверены права и автомобиль." },
  { icon: Star, title: "Реальные отзывы", text: "Оценки оставляют только участники состоявшейся поездки." },
];

export default function WhyItWorks() {
  return (
    <section className="py-6 md:py-8 content-auto">
      <div className="container">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-6 border-t border-fog">
          {ITEMS.map((item) => (
            <div key={item.title}>
              <div className="flex items-center gap-2 mb-1">
                <item.icon className="w-4 h-4 text-river flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <h3 className="font-semibold text-sm text-taiga">{item.title}</h3>
              </div>
              <p className="text-sm text-frost-dark leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
