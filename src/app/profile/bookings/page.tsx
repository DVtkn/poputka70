import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";
import { Ticket, Wallet } from "lucide-react";
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
      review: { select: { id: true } },
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

const STATUS_HINTS: Record<string, string> = {
  PENDING: "Водитель решает, взять ли тебя",
  CONFIRMED: "Место за тобой — встречаемся на остановке",
  COMPLETED: "Поездка завершена",
  CANCELLED: "Заявка снята",
  NO_SHOW: "Поездка не состоялась",
};

function BookingCard({ booking }: { booking: BookingRow }) {
  const route = tripRoute(booking.trip);
  const trip = booking.trip;
  const title = route
    ? `${booking.pickupName ?? route.originName} → ${booking.dropoffName ?? route.destName}`
    : "Поездка";
  const amount = booking.amountDue ?? booking.compensationAmount;

  const active = ["PENDING", "CONFIRMED"].includes(booking.status);
  const cancelDeadline = trip.departureTime.getTime() - CANCEL_CUTOFF_MINUTES * 60 * 1000;
  const canCancel = active && nowMs() < cancelDeadline;
  const canReview = trip.status === "COMPLETED" && !booking.review && booking.status !== "CANCELLED";

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
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <StatusBadge status={booking.status} type="booking" />
          <span className="text-xs text-frost-dark">{STATUS_HINTS[booking.status] ?? ""}</span>
        </div>
      </div>

      {amount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-snow border border-fog/60 px-4 py-3">
          <span className="text-sm text-frost-dark inline-flex items-center gap-1.5">
            <Wallet className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
            Компенсация водителю
          </span>
          <span className="font-utility font-bold">{amount} ₽</span>
        </div>
      )}
      {amount > 0 && (
        <p className="text-xs text-frost-dark mt-2">Оплата — водителю при посадке: наличные или перевод.</p>
      )}
      {booking.status === "CONFIRMED" && route && trip.driver?.phone && (
        <a
          href={`tel:${trip.driver.phone}`}
          className="mt-2 inline-flex items-center gap-1.5 text-sm text-river hover:underline"
        >
          Связаться с водителем: {trip.driver.phone}
        </a>
      )}

      <BookingActions bookingId={booking.id} canCancel={canCancel} canReview={canReview} />
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
      <h1 className="text-h2 mb-2">Мои заявки</h1>
      <p className="text-frost-dark text-sm mb-8">Здесь видно, принял ли водитель твою заявку.</p>

      {bookings.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-6 h-6 text-river" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <h2 className="text-h3 mb-2">Пока нет заявок</h2>
          <p className="text-frost-dark mb-6">Найди попутку на главной — это займёт полминуты</p>
          <Link href="/" className="btn-primary inline-block px-6 py-3">
            Найти попутку
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
