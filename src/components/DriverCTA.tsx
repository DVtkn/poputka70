import Link from "next/link";
import { ArrowRight, Wallet, MapPin, Users, ShieldCheck } from "lucide-react";

const BENEFITS = [
  { icon: Wallet, title: "Бензин" },
  { icon: MapPin, title: "Попутчики по пути" },
  { icon: Users, title: "Ты выбираешь" },
  { icon: ShieldCheck, title: "Проверка документов" },
];

export default function DriverCTA() {
  return (
    <section className="section content-auto">
      <div className="container">
        <div className="rounded-3xl bg-taiga text-white overflow-hidden">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 p-7 md:p-12">
            <div>
              <h2 className="font-display text-2xl md:text-4xl font-bold tracking-[-0.02em] leading-tight mb-3">
                Едешь по городу?
              </h2>
              <p className="text-white/70 leading-relaxed mb-7 max-w-md">
                Возьми соседей: они делят дорогу и бензин. Публикация за полминуты, бесплатно.
              </p>

              <ul className="grid grid-cols-2 gap-x-6 gap-y-4 mb-8 max-w-md" role="list">
                {BENEFITS.map((item) => (
                  <li key={item.title} className="flex items-center gap-2.5 text-sm text-white/85">
                    <item.icon className="w-[18px] h-[18px] text-birch flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
                    {item.title}
                  </li>
                ))}
              </ul>

              <Link href="/driver" className="btn-white group">
                Опубликовать поездку
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2} aria-hidden="true" />
              </Link>
            </div>

            <div className="hidden lg:block">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="text-xs uppercase tracking-[0.14em] text-white/40 mb-5">Так выглядит поездка</div>
                <div className="font-utility text-3xl font-bold mb-5">08:00</div>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm text-white/80">
                    <span className="w-2 h-2 rounded-full bg-river-light flex-shrink-0" aria-hidden="true" />
                    Каштак
                  </div>
                  <div className="ml-[3px] w-px h-5 bg-white/15" aria-hidden="true" />
                  <div className="flex items-center gap-3 text-sm text-white/80">
                    <span className="w-2 h-2 rounded-full bg-birch flex-shrink-0" aria-hidden="true" />
                    Площадь Ленина
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 p-3">
                    <div className="font-utility text-lg font-bold">2 места</div>
                    <div className="text-[11px] text-white/40 mt-0.5">свободно</div>
                  </div>
                  <div className="rounded-xl border border-white/10 p-3">
                    <div className="font-utility text-lg font-bold">100 ₽</div>
                    <div className="text-[11px] text-white/40 mt-0.5">за место</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
