import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Star, ShieldCheck } from "lucide-react";
import TripBooking from "@/components/TripBooking";
import AppShell from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      routeTemplate: { include: { origin: true, destination: true,
        driver: { select: { id: true, firstName: true, lastName: true, ratingAsDriver: true, maxVerifiedAt: true,
          driverProfile: { select: { carModel: true, carColor: true } } } } } },
      bookings: { where: { status: { in: ["PENDING", "CONFIRMED"] } }, select: { id: true } }
    },
  });
  if (!trip) notFound();

  const rt = trip.routeTemplate;
  const availableSeats = rt.seats - trip.bookings.length;
  const serviceFee = Math.round(rt.price * 0.15);
  const formatDate = (date: Date) => {
    const months = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
    const days = ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];
    return days[date.getDay()] + ", " + date.getDate() + " " + months[date.getMonth()];
  };

  return (
    <AppShell backHref={`/routes/${rt.id}`} backLabel="К маршруту">
      <header className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">{rt.origin.name} → {rt.destination.name}</h1>
          <div className="flex items-center gap-4 text-frost">
            <span className="font-utility font-semibold text-taiga">{formatDate(trip.date)}</span>
            <span className="font-utility">{rt.departureTime}</span>
          </div>
        </header>

        <div className="card p-6 mb-6">
          <h2 className="font-semibold mb-4">Точки встречи</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-river mt-1.5 flex-shrink-0"></div>
              <div><div className="font-medium">{rt.origin.name}</div><div className="text-sm text-frost">Главный вход, у остановки</div></div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-birch mt-1.5 flex-shrink-0"></div>
              <div><div className="font-medium">{rt.destination.name}</div><div className="text-sm text-frost">Главный вход, у парковки</div></div>
            </div>
          </div>
        </div>

        <div className="card p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="avatar">{rt.driver.firstName.charAt(0)}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{rt.driver.firstName} {rt.driver.lastName || ""}</span>
                {rt.driver.maxVerifiedAt && (
                  <span className="badge-birch inline-flex items-center">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" strokeWidth={2} aria-hidden="true" />
                    Проверен
                  </span>
                )}
              </div>
              <div className="text-sm text-frost inline-flex items-center gap-1">
                {rt.driver.driverProfile?.carModel} •
                <Star className="w-4 h-4 text-birch fill-birch" aria-hidden="true" />
                <span className="font-utility font-semibold text-taiga">{rt.driver.ratingAsDriver.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>

        {availableSeats > 0 && ["SCHEDULED","CONFIRMED","PENDING_CONFIRMATION"].includes(trip.status) ? (
          <TripBooking tripId={trip.id} compensation={rt.price} serviceFee={serviceFee} availableSeats={availableSeats} />
        ) : (
          <div className="card p-8 text-center">
            {availableSeats === 0 ? <p className="text-frost">Мест больше нет</p> : <p className="text-ember">Рейс недоступен для бронирования</p>}
          </div>
        )}
    </AppShell>
  );
}
