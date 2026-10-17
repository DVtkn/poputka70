import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Car, Star, ShieldCheck, ChevronRight } from "lucide-react";
import AppShell from "@/components/AppShell";

export const dynamic = "force-dynamic";

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const userInclude = {
  driverProfile: {
    select: { verificationStatus: true, carModel: true, carNumber: true, carColor: true },
  },
  routeTemplates: {
    where: { active: true },
    select: {
      id: true,
      departureTime: true,
      daysOfWeek: true,
      seats: true,
      price: true,
      origin: { select: { name: true } },
      destination: { select: { name: true } },
    },
  },
  reviewsReceived: {
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      reviewer: { select: { firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.UserInclude;

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      login: true,
      firstName: true,
      lastName: true,
      bio: true,
      ratingAsDriver: true,
      ratingAsPassenger: true,
      _count: { select: { reviewsReceived: true } },
      ...userInclude,
    },
  });

  if (!user) notFound();

  const userName = `${user.firstName} ${user.lastName || ""}`.trim();
  const initials = userName.split(" ").map((part) => part.charAt(0)).join("").toUpperCase().slice(0, 2);
  const isApprovedDriver = user.driverProfile?.verificationStatus === "APPROVED";

  return (
    <AppShell backHref="/" backLabel="На главную">
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4">
          <Avatar size="xl">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="font-display text-2xl font-bold">{userName}</h1>
              {isApprovedDriver && (
                <Badge variant="birch">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" strokeWidth={2} aria-hidden="true" />
                  Проверен
                </Badge>
              )}
            </div>
            <p className="text-frost-dark text-sm mb-3">@{user.login}</p>
            {user.bio && <p className="text-sm text-frost-dark mb-3 leading-relaxed">{user.bio}</p>}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-birch fill-birch" aria-hidden="true" />
                <span className="font-semibold font-utility">{user.ratingAsDriver.toFixed(1)}</span>
                <span className="text-frost-dark">как водитель</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-birch fill-birch" aria-hidden="true" />
                <span className="font-semibold font-utility">{user.ratingAsPassenger.toFixed(1)}</span>
                <span className="text-frost-dark">как пассажир</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {user.driverProfile && (
        <section className="mb-6">
          <h2 className="font-display text-lg font-semibold mb-3">Автомобиль</h2>
          <div className="card p-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-river/10 flex items-center justify-center flex-shrink-0">
              <Car className="w-8 h-8 text-river" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <div>
              <div className="font-semibold">{user.driverProfile.carModel}</div>
              <div className="text-sm text-frost-dark font-utility">{user.driverProfile.carNumber}</div>
              {user.driverProfile.carColor && (
                <div className="text-xs text-frost-dark mt-0.5">Цвет: {user.driverProfile.carColor}</div>
              )}
            </div>
          </div>
        </section>
      )}

      {user.routeTemplates.length > 0 && (
        <section className="mb-6">
          <h2 className="font-display text-lg font-semibold mb-3">Активные маршруты</h2>
          <div className="space-y-3">
            {user.routeTemplates.map((route) => (
              <Link
                key={route.id}
                href={`/routes/${route.id}`}
                className="card card-hover p-4 flex items-center gap-3 group"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold">
                    {route.origin.name} → {route.destination.name}
                  </h3>
                  <p className="text-sm text-frost-dark mt-0.5">
                    <span className="font-utility">{route.departureTime}</span>
                    {" • "}
                    {route.daysOfWeek.map((d) => DAY_NAMES[d - 1] || String(d)).join(", ")}
                    {" • "}
                    {route.seats} мест
                  </p>
                </div>
                <span className="font-utility text-lg font-semibold whitespace-nowrap">{route.price} ₽</span>
                <ChevronRight
                  className="w-5 h-5 text-fog group-hover:text-river group-hover:translate-x-0.5 transition-all flex-shrink-0"
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      {user.reviewsReceived.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold mb-3">
            Отзывы ({user._count.reviewsReceived})
          </h2>
          <div className="space-y-3">
            {user.reviewsReceived.map((review) => (
              <div key={review.id} className="card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="avatar avatar-md text-sm">
                    {review.reviewer.firstName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">
                      {review.reviewer.firstName} {review.reviewer.lastName || ""}
                    </div>
                    <div className="flex items-center gap-0.5" aria-label={`Оценка ${review.rating} из 5`}>
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
                {review.comment && <p className="text-sm text-frost-dark leading-relaxed">{review.comment}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {user.routeTemplates.length === 0 && user.reviewsReceived.length === 0 && (
        <div className="card p-8 text-center text-frost-dark">
          Пока нет активных маршрутов и отзывов
        </div>
      )}
    </AppShell>
  );
}
