import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";
import { Car, Phone, Star } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import BookingDecision from "@/components/BookingDecision";
import TripActions from "@/components/TripActions";
import AppShell from "@/components/AppShell";
import { tripRoute, tripRouteSelect } from "@/lib/trips";
import { sweepTripStatuses } from "@/lib/maintenance";
import { formatTomskTime, nowMs } from "@/lib/time";
import { plural } from "@/lib/utils";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function timeAgo(date: Date): string {
  const minutes = Math.floor((nowMs() - date.getTime()) / 60000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  return `${Math.floor(hours / 24)} дн назад`;
}

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

  await sweepTripStatuses();

  const trips = await prisma.trip.findMany({
    where: {
      OR: [{ driverId: user.id }, { routeTemplate: { driverId: user.id } }],
    },
    select: {
      id: true,
      date: true,
      departureTime: true,
      status: true,
      availableSeats: true,
      ...tripRouteSelect,
      bookings: {
        select: {
          id: true,
          status: true,
          amountDue: true,
          compensationAmount: true,
          pickupName: true,
          dropoffName: true,
          note: true,
          passenger: {
            select: { id: true, firstName: true, lastName: true, phone: true, ratingAsPassenger: true },
          },
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { departureTime: "asc" },
    take: 60,
  });

  return (
    <AppShell backHref="/profile" backLabel="В профиль">
      <h1 className="text-h2 mb-2">Мои поездки</h1>
      <p className="text-frost-dark text-sm mb-8">Заявки пассажиров — здесь. Принимай тех, с кем по пути.</p>

      {trips.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-4">
            <Car className="w-6 h-6 text-river" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <h2 className="text-h3 mb-2">Пока нет поездок</h2>
          <p className="text-frost-dark mb-6">Опубликуй первую — пассажиры уже ищут попутки</p>
          <Link href="/driver" className="btn-primary inline-block px-6 py-3">
            Опубликовать поездку
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {trips.map((trip) => {
            const route = tripRoute(trip);
            if (!route) return null;

            const activeBookings = trip.bookings.filter((booking) =>
              ["PENDING", "CONFIRMED"].includes(booking.status)
            );
            const pending = trip.bookings.filter((booking) => booking.status === "PENDING");
            const confirmed = trip.bookings.filter((booking) => booking.status === "CONFIRMED");
            const takenSeats = activeBookings.length;

            const canCancel =
              ["SCHEDULED", "PENDING_CONFIRMATION", "CONFIRMED"].includes(trip.status) &&
              trip.departureTime.getTime() > nowMs();

            return (
              <div key={trip.id} className="card p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                  <div>
                    <h2 className="font-display text-lg font-semibold mb-1">
                      {route.originName} → {route.destName}
                    </h2>
                    <div className="flex items-center gap-x-3 gap-y-1 text-sm text-frost-dark flex-wrap">
                      <span>{formatTripDate(trip.date)}</span>
                      <span aria-hidden="true">•</span>
                      <span className="font-utility">{formatTomskTime(trip.departureTime)}</span>
                      <span aria-hidden="true">•</span>
                      <span>
                        занято {takenSeats} из {route.seatsTotal}
                      </span>
                      {route.price > 0 && (
                        <>
                          <span aria-hidden="true">•</span>
                          <span className="font-utility">{route.price} ₽ за место</span>
                        </>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={trip.status} type="trip" />
                </div>

                {trip.comment && (
                  <p className="text-sm text-frost-dark italic mb-4">«{trip.comment}»</p>
                )}

                {trip.bookings.length === 0 && (
                  <p className="text-sm text-frost-dark mb-4">Пока нет заявок — поездка видна в ленте.</p>
                )}

                {pending.length > 0 && (
                  <div className="space-y-3 mb-4">
                    <div className="text-caption text-birch-dark">
                      Хотят поехать · {pending.length} {plural(pending.length, ["заявка", "заявки", "заявок"])}
                    </div>
                    {pending.map((booking) => (
                      <div
                        key={booking.id}
                        className="rounded-xl border border-birch/25 bg-birch-light-bg/50 p-3.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <Link
                              href={`/users/${booking.passenger.id}`}
                              className="avatar avatar-md text-sm flex-shrink-0"
                              aria-label={`Профиль ${booking.passenger.firstName}`}
                            >
                              {booking.passenger.firstName.charAt(0)}
                            </Link>
                            <div className="min-w-0">
                              <Link
                                href={`/users/${booking.passenger.id}`}
                                className="font-semibold text-sm hover:text-river transition-colors"
                              >
                                {booking.passenger.firstName} {booking.passenger.lastName || ""}
                              </Link>
                              <div className="text-xs text-frost-dark inline-flex items-center gap-1 mt-0.5">
                                <Star className="w-3.5 h-3.5 text-birch fill-birch" strokeWidth={0} aria-hidden="true" />
                                {booking.passenger.ratingAsPassenger.toFixed(1)}
                                {" · "}
                                {timeAgo(booking.createdAt)}
                              </div>
                              <div className="text-sm text-taiga mt-1">
                                {booking.pickupName ?? route.originName} → {booking.dropoffName ?? route.destName}
                              </div>
                              {booking.note && (
                                <div className="text-xs text-frost-dark italic mt-0.5">«{booking.note}»</div>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-utility font-bold text-sm">
                              {booking.amountDue ?? booking.compensationAmount} ₽
                            </div>
                            <div className="text-[11px] text-frost-dark">за место</div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <Link
                            href={`/users/${booking.passenger.id}`}
                            className="text-xs text-river hover:underline"
                          >
                            Профиль и отзывы
                          </Link>
                          <BookingDecision bookingId={booking.id} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {confirmed.length > 0 && (
                  <div className="space-y-2 mb-4 p-3 rounded-xl bg-fog/40">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-caption text-frost-dark">Едут с тобой</div>
                      <div className="text-xs text-frost-dark">
                        {confirmed.reduce((sum, b) => sum + (b.amountDue ?? b.compensationAmount), 0)} ₽ соберёшь
                      </div>
                    </div>
                    {confirmed.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="avatar avatar-sm text-xs">
                            {booking.passenger.firstName.charAt(0)}
                          </span>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">
                              {booking.passenger.firstName} {booking.passenger.lastName || ""}
                            </div>
                            <div className="text-xs text-frost-dark">
                              {booking.pickupName ?? route.originName} → {booking.dropoffName ?? route.destName}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {booking.passenger.phone && (
                            <a
                              href={`tel:${booking.passenger.phone}`}
                              className="text-xs text-river hover:underline inline-flex items-center gap-1"
                            >
                              <Phone className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
                              {booking.passenger.phone}
                            </a>
                          )}
                          <span className="text-xs text-frost-dark font-utility whitespace-nowrap">
                            {(booking.amountDue ?? booking.compensationAmount) > 0
                              ? `${booking.amountDue ?? booking.compensationAmount} ₽`
                              : "без оплаты"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {canCancel && <TripActions tripId={trip.id} cancelOnly />}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
