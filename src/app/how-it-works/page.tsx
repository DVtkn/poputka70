import Link from "next/link";
import AppShell from "@/components/AppShell";

const STEPS = [
  {
    num: "01",
    title: "Поиск маршрута",
    description:
      "Укажите остановки отправления и назначения — в результатах отобразятся подходящие рейсы с ценой и свободными местами.",
  },
  {
    num: "02",
    title: "Заявка на место",
    description:
      "Выберите точки посадки и высадки на маршруте и отправьте заявку.",
  },
  {
    num: "03",
    title: "Поездка и оплата",
    description:
      "Цена известна заранее и передаётся водителю напрямую при посадке, без комиссии сервиса.",
  },
];

export default function HowItWorksPage() {
  return (
    <AppShell backHref="/" backLabel="К поиску поездок">
      <h1 className="text-h2 mb-5">Как работает сервис</h1>

      <div className="bg-white border border-fog rounded-xl divide-y divide-fog overflow-hidden mb-5">
        {STEPS.map((step) => (
          <article key={step.num} className="p-4 sm:p-5 flex items-start gap-4">
            <span className="font-utility text-sm font-bold text-river pt-0.5 flex-shrink-0">{step.num}</span>
            <div>
              <h2 className="font-display text-base sm:text-lg font-semibold text-taiga mb-1">{step.title}</h2>
              <p className="text-sm text-frost-dark leading-relaxed">{step.description}</p>
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-xl bg-taiga text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold">Публикация для водителей</h2>
          <p className="text-sm text-white/75 mt-0.5">
            Укажите маршрут, время, число мест и стоимость.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap">
          <Link href="/driver" className="btn-white whitespace-nowrap">
            Опубликовать поездку
          </Link>
          <Link href="/" className="btn-secondary whitespace-nowrap">
            Найти поездку
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
