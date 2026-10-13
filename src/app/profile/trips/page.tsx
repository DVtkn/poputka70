import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";
import { Car, Clock } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import TripActions from "@/components/TripActions";
import AppShell from "@/components/AppShell";
import { formatTomskTime } from "@/lib/time";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function formatTripDate(date: Date): string {
  return `${WEEKDAYS[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

export default async function DriverTripsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/?callbackUrl=/profile/trips");

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, driverProfile: { select: { id: true } } },
  });
  if (!user?.driverProfile) redirect("/driver");

  const trips = await prisma.trip.findMany({
    where: { routeTemplate: { driverId: user.id } },
    include: {
      routeTemplate: { include: { origin: true, destination: true } },
      bookings: {
        include: { passenger: { select: { id: true, firstName: true, lastName: true, phone: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { date: "asc" },
    take: 60,
  });

  return (
    <AppShell backHref="/profile" backLabel="В профиль">
      <h1 className="text-h2 mb-8">Мои поездки</h1>

      {trips.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-4">
            <Car className="w-6 h-6 text-river" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <h2 className="text-h3 mb-2">Пока нет поездок</h2>
          <p className="text-frost-dark mb-6">Создай маршрут, и рейсы появятся автоматически</p>
          <Link href="/driver" className="btn-primary inline-block px-6 py-3">
            Создать маршрут
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {trips.map((trip) => {
            const route = trip.routeTemplate;
            const activeBookings = trip.bookings.filter((b) => ["PENDING", "CONFIRMED"].includes(b.status));
            const canConfirm = trip.status === "PENDING_CONFIRMATION";
            const canCancel = ["SCHEDULED", "PENDING_CONFIRMATION", "CONFIRMED"].includes(trip.status);

            return (
              <div key={trip.id} className="card p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                  <div>
                    <h2 className="font-display text-lg font-semibold mb-1">
                      {route.origin.name} → {route.destination.name}
                    </h2>
                    <div className="flex items-center gap-x-3 gap-y-1 text-sm text-frost-dark flex-wrap">
                      <span>{formatTripDate(trip.date)}</span>
                      <span aria-hidden="true">•</span>
                      <span className="font-utility">{formatTomskTime(trip.departureTime)}</span>
                      <span aria-hidden="true">•</span>
                      <span>
                        {activeBookings.length}/{route.seats} мест занято
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={trip.status} type="trip" />
                </div>

                {canConfirm && trip.confirmationDeadline && (
                  <p className="flex items-center gap-2 text-sm text-ember mb-4">
                    <Clock className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
                    Подтверди до {formatTomskTime(trip.confirmationDeadline)}, иначе поездка отменится
                  </p>
                )}

                {trip.bookings.length > 0 ? (
                  <div className="space-y-2 mb-4 p-3 rounded-xl bg-fog/40">
                    <div className="text-caption text-frost-dark">Пассажиры</div>
                    {trip.bookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="avatar avatar-sm text-xs">
                            {booking.passenger.firstName.charAt(0)}
                          </span>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">
                              {booking.passenger.firstName} {booking.passenger.lastName || ""}
                            </div>
                            {booking.passenger.phone && booking.status === "CONFIRMED" && (
                              <div className="text-xs text-frost-dark font-utility">{booking.passenger.phone}</div>
                            )}
                          </div>
                        </div>
                        <StatusBadge status={booking.status} type="booking" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-frost-dark mb-4">Пока нет бронирований</p>
                )}

                {(canConfirm || canCancel) && (
                  <TripActions tripId={trip.id} cancelOnly={!canConfirm} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
