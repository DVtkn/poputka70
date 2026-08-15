import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { RouteLine } from "@/components/ui/RouteLine";
import StatusBadge from "@/components/ui/StatusBadge";
import RatingDisplay from "@/components/ui/RatingDisplay";
import AppShell from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default async function RouteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const route = await prisma.routeTemplate.findUnique({
    where: { id },
    include: {
      origin: true, destination: true,
      driver: {
        select: { id: true, firstName: true, lastName: true, ratingAsDriver: true, maxVerifiedAt: true,
          driverProfile: { select: { carModel: true, carColor: true, totalRides: true } } }
      },
      trips: {
        where: { date: { gte: new Date() } },
        orderBy: { date: "asc" }, take: 14,
        include: { bookings: { where: { status: { in: ["PENDING", "CONFIRMED"] } }, select: { id: true } } }
      },
    },
  });

  if (!route) notFound();

  const tripsWithSeats = route.trips.map(trip => ({ ...trip, availableSeats: route.seats - trip.bookings.length }));
  const formatDate = (date: Date) => {
    const months = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
    const days = ["вс","пн","вт","ср","чт","пт","сб"];
    return days[date.getDay()] + ", " + date.getDate() + " " + months[date.getMonth()];
  };
  const isBookable = (status: string, seats: number) => ["SCHEDULED","CONFIRMED","PENDING_CONFIRMATION"].includes(status) && seats > 0;

  return (
    <AppShell backHref="/" backLabel="К ленте поездок">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight mb-2">{route.origin.name} → {route.destination.name}</h1>
          <div className="flex items-center gap-4 text-frost">
            <span className="font-utility">{route.departureTime}</span>
            <span className="w-1 h-1 rounded-full bg-fog"></span>
            <span>{route.daysOfWeek.map(d => ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"][d-1]).join(", ")}</span>
            <span className="w-1 h-1 rounded-full bg-fog"></span>
            <span>{route.seats} мест</span>
          </div>
        </header>

        <div className="card p-6 mb-8"><RouteLine from={route.origin.name} to={route.destination.name} animated /></div>

        <div className="card p-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="avatar w-14 h-14 text-xl">{route.driver.firstName.charAt(0)}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-lg">{route.driver.firstName} {route.driver.lastName || ""}</h2>
                {route.driver.maxVerifiedAt && <StatusBadge status="APPROVED" type="verification" />}
              </div>
              <div className="text-sm text-frost">{route.driver.driverProfile?.carModel} • {route.driver.driverProfile?.totalRides || 0} поездок</div>
            </div>
          </div>
          <RatingDisplay ratingAsDriver={route.driver.ratingAsDriver} compact />
        </div>

        <section>
          <h2 className="font-display text-xl font-bold mb-4">Выбери дату поездки</h2>
          {tripsWithSeats.length === 0 ? (
            <div className="card p-8 text-center"><p className="text-frost">Нет запланированных рейсов на ближайшие 2 недели</p></div>
          ) : (
            <div className="space-y-3">
              {tripsWithSeats.map(trip => {
                const bookable = isBookable(trip.status, trip.availableSeats);
                const cancelled = ["CANCELLED_BY_DRIVER","UNCONFIRMED","CANCELLED_BY_PASSENGER"].includes(trip.status);
                return (
                  <div key={trip.id} className={"card p-4 " + (cancelled ? "opacity-60" : "")}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[80px]">
                          <div className="font-utility font-bold text-lg">{formatDate(trip.date)}</div>
                          <div className="font-utility text-frost text-sm">{trip.departureTime instanceof Date ? trip.departureTime.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : trip.departureTime}</div>
                        </div>
                        <div>
                          <StatusBadge status={trip.status} type="trip" />
                          {trip.availableSeats > 0 && !cancelled && <div className="text-xs text-frost mt-1">Мест: {trip.availableSeats}/{route.seats}</div>}
                          {trip.availableSeats === 0 && !cancelled && <div className="text-xs text-ember mt-1">Мест нет</div>}
                        </div>
                      </div>
                      {bookable ? <Link href={"/trips/" + trip.id} className="btn-primary px-5 py-2.5 text-sm">Выбрать</Link>
                        : trip.availableSeats === 0 && !cancelled ? <button className="btn-secondary px-4 py-2.5 text-sm text-frost">Уведомить</button> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
