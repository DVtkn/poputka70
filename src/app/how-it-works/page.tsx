import Link from "next/link";
import { RouteLine } from "@/components/ui/RouteLine";

export default function HowItWorksPage() {
  const steps = [
    {
      number: "01",
      title: "Найди маршрут",
      description: "Открой ленту, выбери подходящую поездку. Видишь водителя, машину, время и цену сразу.",
    },
    {
      number: "02",
      title: "Забронируй место",
      description: "Оформи бронь за минуту. Сервисный сбор — онлайн, где это доступно; компенсация водителю — на поездке (карта, СБП, наличные).",
    },
    {
      number: "03",
      title: "Езди вместе",
      description: "Водитель подтверждает поездку заранее — за 60 минут до отправления придёт уведомление. Встречаемся в точке и едем.",
    },
  ];

  return (
    <main className="min-h-screen bg-snow py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-taiga mb-3">Как работает Попутка70</h1>
          <p className="text-frost-dark">Три шага от поиска к поездке</p>
        </header>

        <div className="space-y-8">
          {steps.map((step, idx) => (
            <article key={step.number} className="card p-6 md:p-8 relative">
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-river flex items-center justify-center text-white font-display font-bold text-2xl">
                  {step.number}
                </div>
                <div className="flex-1">
                  <h2 className="font-display text-xl font-semibold text-taiga mb-2">{step.title}</h2>
                  <p className="text-frost-dark">{step.description}</p>
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 hidden md:block">
                  <RouteLine from="" to="" animated className="w-1 h-16" />
                </div>
              )}
            </article>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-frost-dark mb-6">Готов начать?</p>
          <Link href="/" className="btn-primary inline-block px-8 py-3 text-base">Найти попутку</Link>
        </div>

        <footer className="mt-16 pt-8 border-t border-fog text-center text-sm text-frost-dark">
          <p>Водитель едет по маршруту независимо от пассажиров. Это не такси.</p>
          <div className="flex justify-center gap-6 mt-4">
            <Link href="/legal/terms" className="hover:text-taiga transition-colors">Оферта</Link>
            <Link href="/legal/privacy" className="hover:text-taiga transition-colors">Конфиденциальность</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}