import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import StickyHeader from "@/components/StickyHeader";
import Hero from "@/components/Hero";
import SocialProof from "@/components/SocialProof";
import RouteList from "@/components/RouteList";
import HowItWorks from "@/components/HowItWorks";
import WhyItWorks from "@/components/WhyItWorks";
import DriverCTA from "@/components/DriverCTA";
import Testimonials from "@/components/Testimonials";
import CtaBanner from "@/components/CtaBanner";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";

export const revalidate = 60;

export interface LandingStats {
  routes: number;
  drivers: number;
  points: number;
  rating: number | null;
  reviewsCount: number;
}

async function getLandingStats(): Promise<LandingStats> {
  try {
    return await fetchLandingStats();
  } catch (error) {
    console.error("[landing] статистика недоступна:", error);
    return { routes: 0, drivers: 0, points: 0, rating: null, reviewsCount: 0 };
  }
}

async function fetchLandingStats(): Promise<LandingStats> {
  const [routes, drivers, points, reviewAgg] = await Promise.all([
    prisma.routeTemplate.count({ where: { active: true } }),
    prisma.driverProfile.count(),
    prisma.stop.count(),
    prisma.review.aggregate({ _avg: { rating: true }, _count: { rating: true } }),
  ]);

  const reviewsCount = reviewAgg._count.rating;
  return {
    routes,
    drivers,
    points,
    rating: reviewsCount > 0 ? Number((reviewAgg._avg.rating ?? 0).toFixed(1)) : null,
    reviewsCount,
  };
}

async function getRecentReviews() {
  try {
    return await fetchRecentReviews();
  } catch {
    return [];
  }
}

async function fetchRecentReviews() {
  const reviews = await prisma.review.findMany({
    take: 6,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      comment: true,
      reviewer: { select: { firstName: true, lastName: true } },
      reviewee: { select: { firstName: true } },
    },
  });
  return reviews
    .filter((review) => review.comment && review.comment.trim().length >= 20)
    .map((review) => ({
      id: review.id,
      author: `${review.reviewer.firstName} ${review.reviewer.lastName || ""}`.trim(),
      content: review.comment ?? "",
      rating: review.rating,
      about: review.reviewee.firstName,
    }));
}

function HeroFallback() {
  return (
    <div className="container pt-16 pb-12 md:pt-24 md:pb-16 lg:pt-32 lg:pb-20" aria-hidden="true">
      <div className="max-w-3xl mx-auto text-center mb-10 md:mb-14 space-y-5">
        <div className="skeleton h-8 w-40 rounded-full mx-auto" />
        <div className="skeleton h-12 md:h-16 w-full max-w-xl mx-auto" />
        <div className="skeleton h-6 w-72 mx-auto" />
      </div>
      <div className="skeleton h-40 md:h-32 w-full max-w-4xl mx-auto rounded-2xl" />
    </div>
  );
}

export default async function Home() {
  const [stats, reviews] = await Promise.all([getLandingStats(), getRecentReviews()]);

  return (
    <div className="flex flex-col min-h-screen bg-snow text-taiga pb-20 md:pb-0">
      <StickyHeader />
      <main id="main" className="flex-1">
        <Suspense fallback={<HeroFallback />}>
          <Hero />
        </Suspense>
        <SocialProof stats={stats} />
        <section className="pt-16 md:pt-20">
          <RouteList />
        </section>
        <HowItWorks />
        <WhyItWorks />
        <DriverCTA />
        <Testimonials reviews={reviews} rating={stats.rating} />
        <CtaBanner stats={stats} />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
