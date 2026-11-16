import Link from "next/link";
import { Car, ChevronRight, Search } from "lucide-react";
import AppShell from "@/components/AppShell";

/**
 * Онбординг без фиксации роли: один аккаунт — обе возможности.
 * Водителем становишься, добавив автомобиль.
 */
export default function OnboardingPage() {
  return (
    <AppShell>
      <div className="max-w-xl mx-auto py-4 sm:py-8">
        <h1 className="text-h2 text-taiga mb-5">Попутка70</h1>

        <div className="bg-white border border-fog rounded-xl divide-y divide-fog overflow-hidden">
          <Link href="/" className="p-4 flex items-center justify-between gap-4 hover:bg-snow/70 transition-colors group">
            <div className="flex items-center gap-3.5">
              <Search className="w-5 h-5 text-river flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <div>
                <div className="font-semibold text-taiga">Найти поездку</div>
                <p className="text-sm text-frost-dark mt-0.5">Поиск по остановкам Томска и пригорода</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-fog group-hover:text-river flex-shrink-0" strokeWidth={2} aria-hidden="true" />
          </Link>

          <Link href="/driver" className="p-4 flex items-center justify-between gap-4 hover:bg-snow/70 transition-colors group">
            <div className="flex items-center gap-3.5">
              <Car className="w-5 h-5 text-river flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
              <div>
                <div className="font-semibold text-taiga">Опубликовать поездку</div>
                <p className="text-sm text-frost-dark mt-0.5">Добавить автомобиль и маршрут</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-fog group-hover:text-river flex-shrink-0" strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
