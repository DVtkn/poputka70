import { Suspense } from "react";
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

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-snow text-taiga">
      <StickyHeader />
      <main className="flex-1">
        <Suspense fallback={<div className="min-h-[480px]" />}>
          <Hero />
        </Suspense>
        <SocialProof />
        <section className="pt-16 md:pt-20">
          <RouteList />
        </section>
        <HowItWorks />
        <WhyItWorks />
        <DriverCTA />
        <Testimonials />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}