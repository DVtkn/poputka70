import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ChevronLeft } from "lucide-react";
import { RouteLine } from "@/components/ui/RouteLine";
import StatusBadge from "@/components/ui/StatusBadge";
import RatingDisplay from "@/components/ui/RatingDisplay";
import AppShell from "@/components/AppShell";
import { ACTIVE_TRIP_STATUSES } from "@/lib/bookings";
import { formatTomskTime, tomskTodayUtc } from "@/lib/time";

export const dynamic = "force-dynamic";

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const WEEKDAY_NAMES = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function formatTripDate(date: Date): string {
  return `${WEEKDAY_NAMES[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

export default async function RouteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const today = tomskTodayUtc();

  const route = await prisma.routeTemplate.findUnique({
    where: { id },
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
          driverProfile: { select: { carModel: true, carColor: true, totalRides: true } },
        },
      },
      trips: {
        where: { date: { gte: today } },
        orderBy: { date: "asc" },
        take: 14,
        select: { id: true, date: true, departureTime: true, status: true, availableSeats: true },
      },
    },
  });

  if (!route) notFound();

  const driverName = `${route.driver.firstName} ${route.driver.lastName || ""}`.trim();

  return (
    <AppShell backHref="/" backLabel="К ленте поездок">
      <header className="mb-8">
        <h1 className="text-h3 mb-2">
          {route.origin.name} → {route.destination.name}
        </h1>
        <div className="flex items-center gap-3 text-frost-dark flex-wrap text-sm">
          <span className="font-utility font-semibold text-taiga">{route.departureTime}</span>
          <span aria-hidden="true">•</span>
          <span>{route.daysOfWeek.map((d) => DAY_NAMES[d - 1] || String(d)).join(", ")}</span>
          <span aria-hidden="true">•</span>
          <span>{route.seats} мест в машине</span>
        </div>
      </header>

      <div className="card p-6 mb-6">
        <RouteLine from={route.origin.name} to={route.destination.name} animated />
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="avatar w-14 h-14 text-xl">{route.driver.firstName.charAt(0)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-lg">{driverName}</h2>
              {route.driver.maxVerifiedAt && (
                <span className="badge-birch">
                  <ShieldCheck className="w-3 h-3" strokeWidth={2} aria-hidden="true" />
                  Проверен
                </span>
              )}
            </div>
            <div className="text-sm text-frost-dark">
              {route.driver.driverProfile?.carModel || "Авто не указано"}
              {route.driver.driverProfile?.carColor ? ` • ${route.driver.driverProfile.carColor}` : ""}
              {" • "}
              {route.driver.driverProfile?.totalRides || 0} поездок
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <RatingDisplay ratingAsDriver={route.driver.ratingAsDriver} compact />
          <Link
            href={`/users/${route.driver.id}`}
            className="text-sm text-river hover:underline inline-flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            Профиль водителя
          </Link>
        </div>
      </div>

      <section>
        <h2 className="text-h3 mb-4">Выбери дату поездки</h2>
        {route.trips.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-frost-dark">Нет запланированных рейсов на ближайшие две недели</p>
          </div>
        ) : (
          <div className="space-y-3">
            {route.trips.map((trip) => {
              const cancelled = trip.status.startsWith("CANCELLED");
              const bookable =
                !cancelled &&
                trip.availableSeats > 0 &&
                (ACTIVE_TRIP_STATUSES as readonly string[]).includes(trip.status);

              return (
                <div key={trip.id} className={`card p-4 ${cancelled ? "opacity-60" : ""}`}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-4">
                      <div className="min-w-[110px]">
                        <div className="font-utility font-bold">{formatTripDate(trip.date)}</div>
                        <div className="font-utility text-frost-dark text-sm">
                          {formatTomskTime(trip.departureTime)}
                        </div>
                      </div>
                      <div>
                        <StatusBadge status={trip.status} type="trip" />
                        {!cancelled && (
                          <div className={`text-xs mt-1 ${trip.availableSeats > 0 ? "text-frost-dark" : "text-ember"}`}>
                            {trip.availableSeats > 0
                              ? `Свободно ${trip.availableSeats} из ${route.seats}`
                              : "Мест нет"}
                          </div>
                        )}
                      </div>
                    </div>

                    {bookable ? (
                      <Link href={`/trips/${trip.id}`} className="btn-primary px-5 py-2.5 text-sm">
                        Выбрать
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
