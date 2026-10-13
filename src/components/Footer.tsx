import Link from "next/link";
import { Car, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-snow border-t border-fog" role="contentinfo">
      <div className="container py-10 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2 font-display text-xl font-bold tracking-tight bg-gradient-to-r from-river to-taiga bg-clip-text text-transparent mb-4 w-fit"
              aria-label="Попутка70 — главная"
            >
              <Car className="w-7 h-7 text-river" strokeWidth={2} aria-hidden="true" />
              <span>Попутка70</span>
            </Link>
            <p className="text-frost-dark text-sm max-w-xs leading-relaxed mb-4">
              Сосед подвозит соседа. Дешевле такси, быстрее автобуса.
            </p>
            <a
              href="mailto:support@poputka70.ru"
              className="inline-flex items-center gap-2 text-sm text-frost-dark hover:text-river transition-colors"
            >
              <Mail className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
              support@poputka70.ru
            </a>
          </div>

          <nav aria-label="Продукт">
            <h3 className="font-semibold text-taiga mb-4">Продукт</h3>
            <ul className="space-y-2.5 text-sm text-frost-dark">
              <li>
                <Link href="/search" className="hover:text-river transition-colors">
                  Найти попутку
                </Link>
              </li>
              <li>
                <Link href="/driver" className="hover:text-river transition-colors">
                  Создать поездку
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-river transition-colors">
                  Как это работает
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Документы">
            <h3 className="font-semibold text-taiga mb-4">Документы</h3>
            <ul className="space-y-2.5 text-sm text-frost-dark">
              <li>
                <Link href="/legal/terms" className="hover:text-river transition-colors">
                  Публичная оферта
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-river transition-colors">
                  Конфиденциальность
                </Link>
              </li>
              <li>
                <a href="mailto:support@poputka70.ru" className="hover:text-river transition-colors">
                  Поддержка
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="pt-8 border-t border-fog flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-frost-dark text-xs text-center md:text-left">
            Попутка70 • Томск • {new Date().getFullYear()}
          </p>
          <p className="text-frost-dark text-xs text-center md:text-left">
            Водителям — бесплатно • Пассажир платит за место и сервисный сбор
          </p>
        </div>
      </div>
    </footer>
  );
}
