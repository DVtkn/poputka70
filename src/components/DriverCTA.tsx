import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function DriverCTA() {
  return (
    <section className="py-5 md:py-7 content-auto">
      <div className="container">
        <div className="rounded-xl bg-taiga text-white px-5 py-4 md:px-6 md:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg md:text-xl font-bold tracking-[-0.015em]">
              Есть свободные места в машине?
            </h2>
            <p className="text-sm text-white/75 mt-0.5">
              Опубликуйте маршрут — пассажиры отправят заявку на поездку.
            </p>
          </div>

          <div className="flex-shrink-0">
            <Link href="/driver" className="btn-white group w-full sm:w-auto">
              Опубликовать поездку
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
