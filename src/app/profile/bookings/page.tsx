import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";
import { MessageSquare, Ticket, Wallet } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import BookingActions from "@/components/BookingActions";
import AppShell from "@/components/AppShell";
import { tripRoute, tripRouteSelect } from "@/lib/trips";
import { sweepTripStatuses } from "@/lib/maintenance";
import { CANCEL_CUTOFF_MINUTES } from "@/lib/bookings";
import { formatTomskTime, nowMs } from "@/lib/time";

export const dynamic = "force-dynamic";

type BookingRow = Awaited<ReturnType<typeof loadBookings>>[number];

async function loadBookings(passengerId: string) {
  return prisma.booking.findMany({
    where: { passengerId },
    select: {
      id: true,
      status: true,
      amountDue: true,
      compensationAmount: true,
      pickupName: true,
      dropoffName: true,
      createdAt: true,
      reviews: {
        where: { reviewerId: passengerId },
        select: { id: true },
      },
      trip: {
        select: {
          id: true,
          date: true,
          departureTime: true,
          status: true,
          ...tripRouteSelect,
          driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

function formatTripDate(date: Date): string {
  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]}`;
}

function BookingCard({ booking }: { booking: BookingRow }) {
  const route = tripRoute(booking.trip);
  const trip = booking.trip;
  const title = route
    ? `${booking.pickupName ?? route.originName} → ${booking.dropoffName ?? route.destName}`
    : "Поездка";
  const amount = booking.amountDue ?? booking.compensationAmount;

  const active = ["PENDING", "CONFIRMED"].includes(booking.status);
  const cancelDeadline = trip.departureTime.getTime() - CANCEL_CUTOFF_MINUTES * 60 * 1000;
  const isWithinGrace = nowMs() - booking.createdAt.getTime() <= 15 * 60 * 1000;
  const canCancel = active && nowMs() < trip.departureTime.getTime() && (nowMs() < cancelDeadline || isWithinGrace);
  const canReview = trip.status === "COMPLETED" && booking.status === "COMPLETED" && booking.reviews.length === 0;

  return (
    <div className={`card p-5 ${booking.status === "CANCELLED" ? "opacity-60" : ""}`}>
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-frost-dark mt-0.5">
            <span className="font-utility">{formatTripDate(trip.date)}</span>
            {" • "}
            <span className="font-utility">{formatTomskTime(trip.departureTime)}</span>
            {route && trip.driver && (
              <>
                {" • водитель "}
                <Link href={`/users/${trip.driver.id}`} className="text-river hover:underline">
                  {trip.driver.firstName}
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex-shrink-0">
          <StatusBadge status={booking.status} type="booking" />
        </div>
      </div>

      {amount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-snow border border-fog/60 px-4 py-2.5">
          <span className="text-sm text-frost-dark inline-flex items-center gap-1.5">
            <Wallet className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
            Цена места (оплата водителю)
          </span>
          <span className="font-utility font-bold">{amount} ₽</span>
        </div>
      )}
      {booking.status === "CONFIRMED" && route && trip.driver?.phone && (
        <a
          href={`tel:${trip.driver.phone}`}
          className="mt-2 inline-flex items-center gap-1.5 text-sm text-river hover:underline"
        >
          Связаться с водителем: {trip.driver.phone}
        </a>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
        <Link
          href={`/trips/${trip.id}#chat`}
          className="text-xs text-river hover:underline inline-flex items-center gap-1.5 font-medium py-1.5 px-2.5 rounded-lg bg-river-light"
        >
          <MessageSquare className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
          Чат с водителем
        </Link>
        <BookingActions bookingId={booking.id} canCancel={canCancel} canReview={canReview} />
      </div>
    </div>
  );
}

export default async function BookingsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/?callbackUrl=/profile/bookings");

  await sweepTripStatuses();
  const bookings = await loadBookings(sessionUser.id);

  const upcoming = bookings.filter((booking) => ["PENDING", "CONFIRMED"].includes(booking.status));
  const completed = bookings.filter((booking) => booking.status === "COMPLETED");
  const cancelled = bookings.filter((booking) => ["CANCELLED", "NO_SHOW"].includes(booking.status));

  return (
    <AppShell backHref="/profile" backLabel="В профиль">
      <h1 className="text-h2 mb-6">Мои заявки</h1>

      {bookings.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="w-11 h-11 rounded-xl bg-river-light flex items-center justify-center mx-auto mb-3">
            <Ticket className="w-5 h-5 text-river" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <h2 className="text-h3 mb-1.5">Нет заявок</h2>
          <p className="text-frost-dark text-sm mb-5">Найдите подходящую поездку в ленте или поиске</p>
          <Link href="/" className="btn-primary inline-flex">
            Найти поездку
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold mb-3">Предстоящие ({upcoming.length})</h2>
              <div className="space-y-4">
                {upcoming.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold mb-3">Завершённые ({completed.length})</h2>
              <div className="space-y-4">
                {completed.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            </section>
          )}

          {cancelled.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold mb-3">Снятые ({cancelled.length})</h2>
              <div className="space-y-4">
                {cancelled.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </AppShell>
  );
}
