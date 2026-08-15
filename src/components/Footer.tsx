"use client";

import Link from "next/link";
import { Car, MessageSquare, Users, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-snow border-t border-fog" role="contentinfo">
      <div className="container py-10 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight bg-gradient-to-r from-river to-taiga bg-clip-text text-transparent mb-4" aria-label="Попутка70 — главная">
              <Car className="w-7 h-7 text-river" strokeWidth={2} />
              <span>Попутка70</span>
            </Link>
            <p className="text-frost text-sm max-w-xs leading-relaxed mb-4">
              Сосед подвозит соседа. Дешевле такси, быстрее автобуса.
            </p>
            <div className="flex gap-4">
              <a href="https://t.me" target="_blank" rel="noopener noreferrer" className="text-frost hover:text-river transition-colors p-2 rounded-lg hover:bg-fog/50" aria-label="Telegram">
                <MessageSquare className="w-5 h-5" strokeWidth={1.5} />
              </a>
              <a href="https://vk.com" target="_blank" rel="noopener noreferrer" className="text-frost hover:text-river transition-colors p-2 rounded-lg hover:bg-fog/50" aria-label="ВКонтакте">
                <Users className="w-5 h-5" strokeWidth={1.5} />
              </a>
              <a href="mailto:support@poputka70.ru" className="text-frost hover:text-river transition-colors p-2 rounded-lg hover:bg-fog/50" aria-label="Email">
                <Mail className="w-5 h-5" strokeWidth={1.5} />
              </a>
            </div>
          </div>

          <nav aria-label="Продукт">
            <h3 className="font-semibold text-taiga mb-4">Продукт</h3>
            <ul className="space-y-2 text-sm text-frost">
              <li><Link href="/search" className="hover:text-river transition-colors">Найти попутку</Link></li>
              <li><Link href="/driver" className="hover:text-river transition-colors">Создать поездку</Link></li>
              <li><Link href="/how-it-works" className="hover:text-river transition-colors">Как это работает</Link></li>
            </ul>
          </nav>

          <nav aria-label="Компания">
            <h3 className="font-semibold text-taiga mb-4">Компания</h3>
            <ul className="space-y-2 text-sm text-frost">
              <li><Link href="/legal/terms" className="hover:text-river transition-colors">Публичная оферта</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-river transition-colors">Конфиденциальность</Link></li>
              <li><a href="mailto:support@poputka70.ru" className="hover:text-river transition-colors">Поддержка</a></li>
            </ul>
          </nav>
        </div>

        <div className="pt-8 border-t border-fog flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-frost text-xs text-center md:text-left">
            Попутка70 • Томск • 2025
          </p>
          <p className="text-frost text-xs text-center md:text-left">
            Бесплатно для водителей • Без комиссий • Оплата напрямую
          </p>
        </div>
      </div>
    </footer>
  );
}