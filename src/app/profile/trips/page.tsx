import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";
import { Car } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import TripActions from "@/components/TripActions";
import AppShell from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default async function DriverTripsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: { driverProfile: true },
  });
  if (!user || !user.driverProfile) redirect("/driver");

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
  });

  const formatDate = (date: Date) => {
    const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
    const d = new Date(date);
    return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
  };

  const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

  return (
    <AppShell backHref="/profile" backLabel="В профиль">
      <h1 className="font-display text-3xl font-bold tracking-[-0.02em] mb-8">Мои поездки</h1>

      {trips.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-4">
            <Car className="w-6 h-6 text-river" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <h3 className="font-display text-xl font-bold mb-2">Пока нет поездок</h3>
          <p className="text-frost mb-6">Создай маршрут, чтобы появились поездки</p>
          <Link href="/driver" className="btn-primary inline-block px-6 py-3">Создать маршрут</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {trips.map((trip) => {
            const rt = trip.routeTemplate;
            const confirmedBookings = trip.bookings.filter((b) => b.status === "CONFIRMED");
            const pendingBookings = trip.bookings.filter((b) => b.status === "PENDING");
            const totalPassengers = confirmedBookings.length + pendingBookings.length;
            const dayName = dayNames[new Date(trip.date).getUTCDay()];

            const canConfirm = trip.status === "PENDING_CONFIRMATION";
            const canCancel = ["SCHEDULED", "PENDING_CONFIRMATION", "CONFIRMED"].includes(trip.status);

            return (
              <div key={trip.id} className="card p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-display text-lg font-semibold mb-1">{rt.origin.name} → {rt.destination.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-frost">
                      <span>{formatDate(trip.date)} ({dayName})</span>
                      <span>•</span>
                      <span className="font-utility">{rt.departureTime}</span>
                      <span>•</span>
                      <span>{totalPassengers}/{rt.seats} мест</span>
                    </div>
                  </div>
                  <StatusBadge status={trip.status} type="trip" />
                </div>

                {trip.bookings.length > 0 && (
                  <div className="space-y-2 mb-4 p-3 rounded-xl bg-fog/40">
                    <div className="text-xs text-frost uppercase tracking-wider mb-2">Пассажиры</div>
                    {trip.bookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="avatar w-7 h-7 text-xs">{booking.passenger.firstName.charAt(0)}</div>
                          <div>
                            <div className="font-medium text-sm">{booking.passenger.firstName} {booking.passenger.lastName || ""}</div>
                            {booking.passenger.phone && booking.status === "CONFIRMED" && (
                              <div className="text-xs text-frost font-utility">{booking.passenger.phone}</div>
                            )}
                          </div>
                        </div>
                        <StatusBadge status={booking.status} type="booking" />
                      </div>
                    ))}
                  </div>
                )}

                {trip.bookings.length === 0 && (
                  <div className="text-sm text-frost mb-4">Пока нет бронирований</div>
                )}

                {canConfirm && <TripActions tripId={trip.id} />}

                {!canConfirm && canCancel && trip.status !== "COMPLETED" && (
                  <TripActions tripId={trip.id} cancelOnly />
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}