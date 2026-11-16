import Link from "next/link";

const STEPS = [
  {
    num: "01",
    title: "Найди поездку",
    text: "Укажи остановки отправления и назначения — покажем водителей по пути.",
  },
  {
    num: "02",
    title: "Запроси место",
    text: "Выбери точку посадки и высадки. Водитель подтверждает заявку одним нажатием.",
  },
  {
    num: "03",
    title: "Поезжайте вместе",
    text: "Встречаетесь на остановке в назначенное время. Оплата напрямую водителю.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-6 md:py-8 content-auto">
      <div className="container">
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h2 className="text-h3 text-taiga">Как устроена поездка</h2>
          <Link href="/how-it-works" className="text-sm font-medium text-river hover:underline">
            Правила сервиса
          </Link>
        </div>

        <div className="bg-white border border-fog rounded-xl grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-fog overflow-hidden">
          {STEPS.map((step) => (
            <div key={step.num} className="p-4 sm:p-5">
              <div className="font-utility text-xs font-bold text-river mb-1.5">{step.num}</div>
              <h3 className="font-semibold text-taiga mb-1">{step.title}</h3>
              <p className="text-sm text-frost-dark leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
