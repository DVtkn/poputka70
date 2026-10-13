import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Star, ShieldCheck } from "lucide-react";
import TripBooking from "@/components/TripBooking";
import StatusBadge from "@/components/ui/StatusBadge";
import AppShell from "@/components/AppShell";
import { ACTIVE_TRIP_STATUSES } from "@/lib/bookings";
import { PRICING_CONFIG } from "@/lib/pricing";
import { formatTomskTime, nowMs } from "@/lib/time";

export const dynamic = "force-dynamic";

const WEEKDAY_NAMES = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      routeTemplate: {
        include: {
          origin: true,
          destination: true,
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              ratingAsDriver: true,
              maxVerifiedAt: true,
              driverProfile: { select: { carModel: true, carColor: true } },
            },
          },
        },
      },
    },
  });

  if (!trip) notFound();

  const rt = trip.routeTemplate;
  const driverName = `${rt.driver.firstName} ${rt.driver.lastName || ""}`.trim();
  // Цена берётся из того же источника, что и на сервере при бронировании
  const serviceFee = rt.serviceFee > 0 ? rt.serviceFee : Math.round(rt.price * (PRICING_CONFIG.serviceFeePercent / 100));
  const tripDate = `${WEEKDAY_NAMES[trip.date.getUTCDay()]}, ${trip.date.getUTCDate()} ${MONTHS[trip.date.getUTCMonth()]}`;
  const bookable =
    trip.availableSeats > 0 &&
    (ACTIVE_TRIP_STATUSES as readonly string[]).includes(trip.status) &&
    trip.departureTime.getTime() > nowMs();

  return (
    <AppShell backHref={`/routes/${rt.id}`} backLabel="К маршруту">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h1 className="text-h3">
            {rt.origin.name} → {rt.destination.name}
          </h1>
          <StatusBadge status={trip.status} type="trip" />
        </div>
        <div className="flex items-center gap-3 text-frost-dark flex-wrap text-sm">
          <span className="font-utility font-semibold text-taiga">{tripDate}</span>
          <span aria-hidden="true">•</span>
          <span className="font-utility">{formatTomskTime(trip.departureTime)}</span>
        </div>
      </header>

      <div className="card p-6 mb-6">
        <h2 className="font-semibold mb-4">Точки встречи</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 rounded-full bg-river mt-1.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <div className="font-medium">{rt.origin.name}</div>
              <div className="text-sm text-frost-dark">Главный вход, у остановки</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 rounded-full bg-birch mt-1.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <div className="font-medium">{rt.destination.name}</div>
              <div className="text-sm text-frost-dark">Главный вход, у парковки</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="avatar">{rt.driver.firstName.charAt(0)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/users/${rt.driver.id}`} className="font-semibold hover:text-river transition-colors">
                {driverName}
              </Link>
              {rt.driver.maxVerifiedAt && (
                <span className="badge-birch">
                  <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
                  Проверен
                </span>
              )}
            </div>
            <div className="text-sm text-frost-dark inline-flex items-center gap-1.5 mt-0.5">
              {rt.driver.driverProfile?.carModel || "Авто не указано"}
              <span aria-hidden="true">•</span>
              <Star className="w-4 h-4 text-birch fill-birch" aria-hidden="true" />
              <span className="font-utility font-semibold text-taiga">
                {rt.driver.ratingAsDriver.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {bookable ? (
        <TripBooking
          tripId={trip.id}
          compensation={rt.price}
          serviceFee={serviceFee}
          availableSeats={trip.availableSeats}
        />
      ) : (
        <div className="card p-8 text-center">
          {trip.availableSeats === 0 ? (
            <p className="text-frost-dark">Мест больше нет</p>
          ) : (
            <p className="text-ember">Рейс недоступен для бронирования</p>
          )}
        </div>
      )}
    </AppShell>
  );
}
