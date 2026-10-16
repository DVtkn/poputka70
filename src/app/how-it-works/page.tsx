import Link from "next/link";
import { Car, Search, Send } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Найди попутку",
    description:
      "Введи откуда и куда. Покажем поездки соседей, которые едут в твою сторону, — с ценой и свободными местами.",
  },
  {
    icon: Send,
    title: "Запроси место",
    description:
      "Выбери, где сядешь и где выйдешь: можно на любой остановке по пути. Водитель принял — место за тобой.",
  },
  {
    icon: Car,
    title: "Договорись и поехали",
    description:
      "Встречаетесь на остановке. Цена честная и видна заранее — оплата водителю напрямую, наличными или переводом.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-snow py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-h2 mb-3">Как работают попутки</h1>
          <p className="text-frost-dark">Три шага от поиска до поездки</p>
        </header>

        <div className="space-y-6">
          {steps.map((step, index) => (
            <article key={step.title} className="card p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-start gap-5">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-river flex items-center justify-center text-white">
                  <step.icon className="w-6 h-6" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <div className="text-caption text-frost-dark mb-1">Шаг {index + 1}</div>
                  <h2 className="font-display text-xl font-semibold text-taiga mb-2">{step.title}</h2>
                  <p className="text-frost-dark leading-relaxed">{step.description}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <section className="card p-6 md:p-8 mt-6 bg-taiga text-white border-taiga">
          <h2 className="font-display text-xl font-semibold mb-2">А если ты за рулём?</h2>
          <p className="text-white/70 leading-relaxed mb-4">
            Опубликуй поездку за полминуты: откуда, куда, когда, сколько мест и цена. Заявки приходят к тебе —
            принимай или отклоняй. Попутка70 бесплатна для водителей.
          </p>
          <Link href="/driver" className="btn-white inline-flex">Опубликовать поездку</Link>
        </section>

        <div className="mt-12 text-center">
          <p className="text-frost-dark mb-6">Готов найти соседа по дороге?</p>
          <Link href="/" className="btn-primary inline-block px-8 py-3 text-base">Найти попутку</Link>
        </div>

        <footer className="mt-16 pt-8 border-t border-fog text-center text-sm text-frost-dark">
          <p>Водитель едет по своим делам и берёт попутчиков — это не такси.</p>
          <div className="flex justify-center gap-6 mt-4">
            <Link href="/legal/terms" className="hover:text-taiga transition-colors">Оферта</Link>
            <Link href="/legal/privacy" className="hover:text-taiga transition-colors">Конфиденциальность</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
