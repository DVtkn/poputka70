import Link from "next/link";
import { Car, Search } from "lucide-react";

/**
 * Онбординг без фиксации роли: один аккаунт — обе возможности.
 * Водителем становишься, добавив автомобиль.
 */
export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-snow py-12 px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-taiga mb-3">Добро пожаловать в Попутка70</h1>
          <p className="text-frost-dark leading-relaxed">
            Один аккаунт — обе стороны дороги. Сегодня едешь пассажиром, завтра подвозишь соседей.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Link href="/" className="card card-hover p-5">
            <div className="w-10 h-10 rounded-lg bg-river-light text-river flex items-center justify-center mb-3">
              <Search className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div className="font-semibold mb-1">Найти попутку</div>
            <p className="text-sm text-frost-dark">Поездки соседей по городу</p>
          </Link>
          <Link href="/driver" className="card card-hover p-5">
            <div className="w-10 h-10 rounded-lg bg-river-light text-river flex items-center justify-center mb-3">
              <Car className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div className="font-semibold mb-1">Подвезти соседей</div>
            <p className="text-sm text-frost-dark">Добавь авто и публикуй поездки</p>
          </Link>
        </div>

        <p className="text-center text-xs text-frost-dark mt-6 leading-relaxed">
          Роли не фиксируются: водитель может быть пассажиром и наоборот. Всё в одном аккаунте.
        </p>
      </div>
    </div>
  );
}
