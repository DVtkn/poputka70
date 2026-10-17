import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Star, MapPin } from "lucide-react";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/ui/StatusBadge";
import RequestSeatBox from "@/components/RequestSeatBox";
import BookingSheet from "@/components/BookingSheet";
import { getSessionUser } from "@/lib/auth";
import { tripRoute } from "@/lib/trip-rules";
import { plural } from "@/lib/utils";
import { corridorStops, tripRouteSelect } from "@/lib/trips";
import { formatTomskTime, nowMs } from "@/lib/time";

export const dynamic = "force-dynamic";

const WEEKDAY_NAMES = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [trip, sessionUser] = await Promise.all([
    prisma.trip.findUnique({
      where: { id },
      select: {
        id: true,
        date: true,
        departureTime: true,
        status: true,
        availableSeats: true,
        ...tripRouteSelect,
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
      },
    }),
    getSessionUser(),
  ]);

  if (!trip) notFound();
  const route = tripRoute(trip);
  if (!route) notFound();

  const driverName = trip.driver
    ? `${trip.driver.firstName} ${trip.driver.lastName || ""}`.trim()
    : "Водитель";
  const tripDate = `${WEEKDAY_NAMES[trip.date.getUTCDay()]}, ${trip.date.getUTCDate()} ${MONTHS[trip.date.getUTCMonth()]}`;
  const timeLabel = formatTomskTime(trip.departureTime);
  const corridor = await corridorStops(route);
  const isOwnTrip = sessionUser?.id === route.driverId;

  const bookable =
    !isOwnTrip &&
    trip.availableSeats > 0 &&
    ["CONFIRMED", "SCHEDULED", "PENDING_CONFIRMATION"].includes(trip.status) &&
    trip.departureTime.getTime() > nowMs();

  return (
    <AppShell backHref="/search" backLabel="К поиску">
      <header className="mb-6">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h1 className="text-h3">
            {route.originName} → {route.destName}
          </h1>
          <StatusBadge status={trip.status} type="trip" />
        </div>
        <div className="flex items-center gap-x-3 gap-y-1 text-frost-dark flex-wrap text-sm">
          <span className="font-utility font-semibold text-taiga">{tripDate}</span>
          <span aria-hidden="true">•</span>
          <span className="font-utility">{timeLabel}</span>
          <span aria-hidden="true">•</span>
          <span>
            свободно {trip.availableSeats} из {route.seatsTotal}
          </span>
        </div>
      </header>

      {route.comment && (
        <div className="card p-4 mb-6 text-sm text-taiga bg-birch-light-bg/60 border-birch/20">
          «{route.comment}»
        </div>
      )}

      <div className="card p-5 mb-6">
        <div className="flex items-center gap-4">
          <div className="avatar">{driverName.charAt(0)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {trip.driver ? (
                <Link href={`/users/${trip.driver.id}`} className="font-semibold hover:text-river transition-colors">
                  {driverName}
                </Link>
              ) : (
                <span className="font-semibold">{driverName}</span>
              )}
              {trip.driver?.maxVerifiedAt && (
                <span className="badge-birch">
                  <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
                  Проверен
                </span>
              )}
            </div>
            <div className="text-sm text-frost-dark flex items-center gap-1.5 mt-0.5">
              {trip.driver?.driverProfile?.carModel || "Машина не указана"}
              <span aria-hidden="true">•</span>
              <Star className="w-4 h-4 text-birch fill-birch" aria-hidden="true" />
              <span className="font-utility font-semibold text-taiga">
                {(trip.driver?.ratingAsDriver ?? 5).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5 mb-6">
        <h2 className="font-semibold mb-3">По пути — {corridor.length} {plural(corridor.length, ["остановка", "остановки", "остановок"])}</h2>
        <ul className="space-y-2 max-h-64 overflow-auto pr-1">
          <li className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-river flex-shrink-0" aria-hidden="true" />
            <span className="font-medium">{route.originName}</span>
            <span className="text-frost-dark text-xs">начало</span>
          </li>
          {corridor
            .filter((stop) => stop.name !== route.originName && stop.name !== route.destName)
            .map((stop) => (
              <li key={stop.id} className="flex items-center gap-2 text-sm text-frost-dark">
                <MapPin className="w-3.5 h-3.5 text-fog flex-shrink-0" strokeWidth={2} aria-hidden="true" />
                <span className="truncate">{stop.name}</span>
              </li>
            ))}
          <li className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-birch flex-shrink-0" aria-hidden="true" />
            <span className="font-medium">{route.destName}</span>
            <span className="text-frost-dark text-xs">конец</span>
          </li>
        </ul>
      </div>

      {bookable ? (
        <>
          <div className="hidden md:block">
            <RequestSeatBox
              tripId={trip.id}
              originName={route.originName}
              destName={route.destName}
              priceFull={route.price}
              seatsLeft={trip.availableSeats}
              corridor={corridor.map((stop) => ({ id: stop.id, name: stop.name }))}
            />
          </div>
          <BookingSheet
            tripId={trip.id}
            originName={route.originName}
            destName={route.destName}
            priceFull={route.price}
            seatsLeft={trip.availableSeats}
            corridor={corridor.map((stop) => ({ id: stop.id, name: stop.name }))}
          />
          <div className="h-20 md:hidden" aria-hidden="true" />
        </>
      ) : (
        <div className="card p-8 text-center">
          {isOwnTrip ? (
            <p className="text-frost-dark">Это твоя поездка — управляй заявками в «Моих поездках».</p>
          ) : trip.availableSeats === 0 ? (
            <p className="text-frost-dark">Свободных мест больше нет</p>
          ) : (
            <p className="text-ember">Поездка недоступна для заявок</p>
          )}
        </div>
      )}
    </AppShell>
  );
}
