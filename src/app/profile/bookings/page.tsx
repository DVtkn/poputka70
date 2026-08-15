import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";
import { Ticket } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import PriceBreakdown from "@/components/ui/PriceBreakdown";
import AppShell from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/");

  const bookings = await prisma.booking.findMany({
    where: { passengerId: sessionUser.id },
    include: {
      trip: { include: { routeTemplate: { include: { origin: true, destination: true,
        driver: { select: { firstName: true, lastName: true } } } } } }
    },
    orderBy: { createdAt: "desc" },
  });

  const formatDate = (date: Date) => {
    const months = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];
    return date.getDate() + " " + months[date.getMonth()] + " " + date.getFullYear();
  };

  const upcoming = bookings.filter(b => ["PENDING","CONFIRMED"].includes(b.status));
  const completed = bookings.filter(b => b.status === "COMPLETED");
  const cancelled = bookings.filter(b => ["CANCELLED","NO_SHOW"].includes(b.status));

  return (
    <AppShell backHref="/profile" backLabel="В профиль">
      <h1 className="font-display text-3xl font-bold tracking-[-0.02em] mb-8">Мои бронирования</h1>

      {bookings.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-6 h-6 text-river" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <h3 className="font-display text-xl font-bold mb-2">Пока нет бронирований</h3>
          <p className="text-frost mb-6">Найди подходящий маршрут на главной</p>
          <Link href="/" className="btn-primary inline-block px-6 py-3">Найти попутку</Link>
        </div>
      ) : (
          <div className="space-y-6">
            {upcoming.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-semibold mb-3">Предстоящие ({upcoming.length})</h2>
                <div className="space-y-3">
                  {upcoming.map(b => {
                    const rt = b.trip.routeTemplate;
                    return (
                      <div key={b.id} className="card p-5">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold">{rt.origin.name} → {rt.destination.name}</h3>
                            <p className="text-sm text-frost">{formatDate(b.trip.date)} • {rt.departureTime}</p>
                          </div>
                          <StatusBadge status={b.status} type="booking" />
                        </div>
                        <div className="text-sm text-frost mb-3">Водитель: {rt.driver.firstName} {rt.driver.lastName || ""}</div>
                        <PriceBreakdown compensation={b.compensationAmount} serviceFee={b.serviceFeeAmount} />
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {completed.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-semibold mb-3">Завершённые ({completed.length})</h2>
                <div className="space-y-3">
                  {completed.map(b => {
                    const rt = b.trip.routeTemplate;
                    return (
                      <div key={b.id} className="card p-5 opacity-75">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold">{rt.origin.name} → {rt.destination.name}</h3>
                            <p className="text-sm text-frost">{formatDate(b.trip.date)} • {rt.departureTime}</p>
                          </div>
                          <StatusBadge status={b.status} type="booking" />
                        </div>
                        <PriceBreakdown compensation={b.compensationAmount} serviceFee={b.serviceFeeAmount} />
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {cancelled.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-semibold mb-3">Отменённые ({cancelled.length})</h2>
                <div className="space-y-3">
                  {cancelled.map(b => {
                    const rt = b.trip.routeTemplate;
                    return (
                      <div key={b.id} className="card p-5 opacity-60">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold">{rt.origin.name} → {rt.destination.name}</h3>
                            <p className="text-sm text-frost">{formatDate(b.trip.date)} • {rt.departureTime}</p>
                          </div>
                          <StatusBadge status={b.status} type="booking" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
    </AppShell>
  );
}
