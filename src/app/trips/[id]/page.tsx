import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Star } from "lucide-react";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/ui/StatusBadge";
import RequestSeatBox from "@/components/RequestSeatBox";
import BookingSheet from "@/components/BookingSheet";
import RouteMap from "@/components/RouteMap";
import TripChat from "@/components/TripChat";
import TripShareButton from "@/components/TripShareButton";
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
        routeStops: true,
        routeNumber: true,
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
  const routeStops = Array.isArray(trip.routeStops)
    ? (trip.routeStops as unknown as Array<{ name: string; lat: number | null; lng: number | null }>)
    : null;
  const isOwnTrip = sessionUser?.id === route.driverId;

  const bookable =
    !isOwnTrip &&
    trip.availableSeats > 0 &&
    ["CONFIRMED", "SCHEDULED", "PENDING_CONFIRMATION"].includes(trip.status) &&
    trip.departureTime.getTime() > nowMs();

  return (
    <AppShell backHref="/search" backLabel="К поиску">
      <header className="mb-6">
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-h3">
              {route.originName} → {route.destName}
            </h1>
            <StatusBadge status={trip.status} type="trip" />
          </div>
          <TripShareButton
            origin={route.originName}
            dest={route.destName}
            dateStr={tripDate}
            timeStr={timeLabel}
            availableSeats={trip.availableSeats}
            price={route.price}
          />
        </div>
        <div className="flex items-center gap-x-3 gap-y-1 text-frost-dark flex-wrap text-sm">
          <span className="font-medium text-taiga">{tripDate}</span>
          <span aria-hidden="true">•</span>
          <span className="font-utility font-semibold text-taiga">{timeLabel}</span>
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

      {(() => {
        const mapPoints =
          routeStops && routeStops.length > 1
            ? routeStops
            : [
                { name: route.originName, lat: route.origin.lat, lng: route.origin.lng },
                ...corridor
                  .filter((s) => s.name !== route.originName && s.name !== route.destName)
                  .map((s) => ({
                    name: s.name,
                    lat: s.lat,
                    lng: s.lng,
                    address: s.address,
                  })),
                { name: route.destName, lat: route.dest.lat, lng: route.dest.lng },
              ];

        return (
          <div className="card p-5 mb-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-semibold">
                Маршрут{trip.routeNumber ? ` №${trip.routeNumber}` : ""} — {mapPoints.length}{" "}
                {plural(mapPoints.length, ["остановка", "остановки", "остановок"])}
              </h2>
            </div>
            <RouteMap points={mapPoints} originName={route.originName} destName={route.destName} />
            <ol className="mt-4 space-y-2 max-h-64 overflow-auto pr-1">
              {mapPoints.map((stop, index) => {
                const first = index === 0;
                const last = index === mapPoints.length - 1;
                return (
                  <li key={`${stop.name}-${index}`} className="flex items-start gap-2.5 text-sm">
                    <span
                      className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                        first ? "bg-river" : last ? "bg-birch" : "bg-fog"
                      }`}
                      aria-hidden="true"
                    />
                    <span className={first || last ? "font-medium" : "text-frost-dark"}>{stop.name}</span>
                    {first && <span className="text-xs text-frost-dark">начало</span>}
                    {last && <span className="text-xs text-frost-dark">конец</span>}
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })()}

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
            <div>
              <p className="text-frost-dark mb-4">Это твоя поездка. Кто хочет поехать и заявки — в кабинете.</p>
              <a href="/profile/trips" className="btn-secondary inline-flex">Открыть заявки</a>
            </div>
          ) : trip.availableSeats === 0 ? (
            <p className="text-frost-dark">Свободных мест больше нет</p>
          ) : (
            <p className="text-ember">Поездка недоступна для заявок</p>
          )}
        </div>
      )}

      <TripChat
        tripId={trip.id}
        initialUserId={sessionUser?.id}
        driverName={driverName}
      />
    </AppShell>
  );
}
