import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";
import { Ticket } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import PriceBreakdown from "@/components/ui/PriceBreakdown";
import BookingActions from "@/components/BookingActions";
import AppShell from "@/components/AppShell";
import { CANCEL_CUTOFF_MINUTES } from "@/lib/bookings";
import { formatTomskTime, nowMs } from "@/lib/time";

export const dynamic = "force-dynamic";

type BookingRow = Awaited<ReturnType<typeof loadBookings>>[number];

async function loadBookings(passengerId: string) {
  return prisma.booking.findMany({
    where: { passengerId },
    include: {
      review: { select: { id: true } },
      trip: {
        include: {
          routeTemplate: {
            include: {
              origin: true,
              destination: true,
              driver: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

function formatTripDate(date: Date): string {
  const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function feeBadge(booking: BookingRow) {
  if (booking.serviceFeeStatus === "PAID") return { cls: "badge-river", text: "Сбор оплачен" };
  if (booking.serviceFeeStatus === "REFUNDED") return { cls: "badge-frost", text: "Сбор возвращён" };
  return { cls: "badge-ember", text: `Сбор: ожидает оплаты` };
}

function BookingCard({ booking }: { booking: BookingRow }) {
  const route = booking.trip.routeTemplate;
  const active = ["PENDING", "CONFIRMED"].includes(booking.status);
  const cancelDeadline = booking.trip.departureTime.getTime() - CANCEL_CUTOFF_MINUTES * 60 * 1000;
  const canCancel = active && nowMs() < cancelDeadline;
  const canPay = active && booking.serviceFeeStatus === "PENDING" && booking.serviceFeeAmount > 0;
  const canReview = booking.trip.status === "COMPLETED" && !booking.review;
  const badge = feeBadge(booking);

  return (
    <div className={`card p-5 ${booking.status === "CANCELLED" ? "opacity-60" : ""}`}>
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold">
            {route.origin.name} → {route.destination.name}
          </h3>
          <p className="text-sm text-frost-dark mt-0.5">
            <span className="font-utility">{formatTripDate(booking.trip.date)}</span>
            {" • "}
            <span className="font-utility">{formatTomskTime(booking.trip.departureTime)}</span>
            {" • водитель "}
            <Link href={`/users/${route.driver.id}`} className="text-river hover:underline">
              {route.driver.firstName}
            </Link>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <StatusBadge status={booking.status} type="booking" />
          <span className={`${badge.cls} whitespace-nowrap`}>{badge.text}</span>
        </div>
      </div>

      <PriceBreakdown compensation={booking.compensationAmount} serviceFee={booking.serviceFeeAmount} />

      <BookingActions bookingId={booking.id} canCancel={canCancel} canPay={canPay} canReview={canReview} />
    </div>
  );
}

export default async function BookingsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/?callbackUrl=/profile/bookings");

  const bookings = await loadBookings(sessionUser.id);

  const upcoming = bookings.filter((b) => ["PENDING", "CONFIRMED"].includes(b.status));
  const completed = bookings.filter((b) => ["COMPLETED"].includes(b.status));
  const cancelled = bookings.filter((b) => ["CANCELLED", "NO_SHOW"].includes(b.status));

  return (
    <AppShell backHref="/profile" backLabel="В профиль">
      <h1 className="text-h2 mb-8">Мои бронирования</h1>

      {bookings.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-6 h-6 text-river" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <h2 className="text-h3 mb-2">Пока нет бронирований</h2>
          <p className="text-frost-dark mb-6">Найди подходящий маршрут на главной</p>
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
              <h2 className="font-display text-lg font-semibold mb-3">Отменённые ({cancelled.length})</h2>
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
