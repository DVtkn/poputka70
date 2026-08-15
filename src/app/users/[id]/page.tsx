import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Car, Star, ShieldCheck } from "lucide-react";
import AppShell from "@/components/AppShell";

export const dynamic = "force-dynamic";

interface PublicProfileUser {
  id: string;
  login: string;
  firstName: string;
  lastName: string | null;
  ratingAsDriver: number;
  ratingAsPassenger: number;
  driverProfile: {
    verificationStatus: string;
    carModel: string;
    carNumber: string;
    carColor: string | null;
  } | null;
  routeTemplates: Array<{
    id: string;
    origin: { name: string };
    destination: { name: string };
    departureTime: string;
    daysOfWeek: number[];
    seats: number;
    price: number;
  }>;
  reviewsReceived: Array<{
    id: string;
    rating: number;
    comment: string | null;
    reviewer: { firstName: string; lastName: string | null };
  }>;
}

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      driverProfile: true,
      routeTemplates: {
        where: { active: true },
        include: { origin: true, destination: true },
      },
      reviewsReceived: {
        where: { revieweeId: id },
        include: { reviewer: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  }) as PublicProfileUser | null;

  if (!user) notFound();

  const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const userName = `${user.firstName} ${user.lastName || ""}`.trim();

  return (
    <AppShell backHref="/" backLabel="На главную">
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4">
          <Avatar size="xl">
            <AvatarFallback>{userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-display text-2xl font-bold">{user.firstName} {user.lastName || ""}</h1>
              {user.driverProfile && user.driverProfile.verificationStatus === "APPROVED" && (
                <Badge variant="birch">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" strokeWidth={2} aria-hidden="true" />
                  Проверен
                </Badge>
              )}
            </div>
            <p className="text-frost mb-2">@{user.login}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-birch fill-birch" aria-hidden="true" />
                <span className="font-semibold">{user.ratingAsDriver.toFixed(1)}</span>
                <span className="text-frost">как водитель</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-birch fill-birch" aria-hidden="true" />
                <span className="font-semibold">{user.ratingAsPassenger.toFixed(1)}</span>
                <span className="text-frost">как пассажир</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {user.driverProfile && (
        <section className="mb-6">
          <h2 className="font-display text-lg font-semibold mb-3">Автомобиль</h2>
          <div className="card p-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-river/10 flex items-center justify-center">
              <Car className="w-8 h-8 text-river" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <div>
              <div className="font-semibold">{user.driverProfile.carModel}</div>
              <div className="text-sm text-frost font-utility">{user.driverProfile.carNumber}</div>
              {user.driverProfile.carColor && <div className="text-xs text-frost">Цвет: {user.driverProfile.carColor}</div>}
            </div>
          </div>
        </section>
      )}

      {user.routeTemplates.length > 0 && (
        <section className="mb-6">
          <h2 className="font-display text-lg font-semibold mb-3">Активные маршруты</h2>
          <div className="space-y-3">
            {user.routeTemplates.map((rt: { id: string; origin: { name: string }; destination: { name: string }; departureTime: string; daysOfWeek: number[]; seats: number; price: number }) => (
              <div key={rt.id} className="card p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{rt.origin.name} → {rt.destination.name}</h3>
                    <p className="text-sm text-frost">
                      {rt.departureTime} • {rt.daysOfWeek.map((d: number) => dayNames[d - 1] || String(d)).join(", ")} • {rt.seats} мест
                    </p>
                  </div>
                  <span className="font-utility text-lg font-semibold">{rt.price} ₽</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {user.reviewsReceived.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold mb-3">Отзывы</h2>
          <div className="space-y-3">
            {user.reviewsReceived.map((review: { id: string; rating: number; comment: string | null; reviewer: { firstName: string; lastName: string | null } }) => (
              <div key={review.id} className="card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-river to-birch flex items-center justify-center text-white font-bold text-sm">
                    {review.reviewer.firstName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{review.reviewer.firstName} {review.reviewer.lastName || ""}</div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < review.rating ? "text-birch fill-birch" : "text-fog fill-fog"}`}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {review.comment && <p className="text-sm text-frost">{review.comment}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}