import Link from "next/link";
import { Mail, Send } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-fog bg-snow mt-4 content-auto" role="contentinfo">
      <div className="container py-10 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="font-display text-lg font-extrabold tracking-tight text-taiga mb-3 block">
              Попутка<span className="text-river">70</span>
            </Link>
            <p className="text-sm text-frost-dark leading-relaxed max-w-[220px]">
              Соседи делят дорогу и бензин. Томск, 2026.
            </p>
          </div>

          <nav aria-label="Продукт">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-frost-dark mb-3">Продукт</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="text-taiga hover:text-river transition-colors">Лента попуток</Link></li>
              <li><Link href="/search" className="text-taiga hover:text-river transition-colors">Поиск</Link></li>
              <li><Link href="/driver" className="text-taiga hover:text-river transition-colors">Опубликовать поездку</Link></li>
            </ul>
          </nav>

          <nav aria-label="Помощь">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-frost-dark mb-3">Помощь</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/how-it-works" className="text-taiga hover:text-river transition-colors">Как это работает</Link></li>
              <li><Link href="/legal/terms" className="text-taiga hover:text-river transition-colors">Оферта</Link></li>
              <li><Link href="/legal/privacy" className="text-taiga hover:text-river transition-colors">Конфиденциальность</Link></li>
            </ul>
          </nav>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-frost-dark mb-3">Связь</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="https://t.me/poputka70"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-taiga hover:text-river transition-colors"
                >
                  <Send className="w-4 h-4 text-river" strokeWidth={1.75} aria-hidden="true" />
                  Telegram: @poputka70
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@poputka70.ru"
                  className="inline-flex items-center gap-2 text-taiga hover:text-river transition-colors"
                >
                  <Mail className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
                  support@poputka70.ru
                </a>
              </li>
            </ul>
            <p className="text-xs text-frost-dark mt-4 leading-relaxed">
              Платформа бесплатна. Оплата водителю при посадке.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-fog flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-frost-dark">Попутка70, Томск, {new Date().getFullYear()}</p>
          <p className="text-xs text-frost-dark">Водитель едет по своим делам и берёт попутчиков. Это не такси.</p>
        </div>
      </div>
    </footer>
  );
}
