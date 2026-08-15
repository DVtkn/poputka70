"use client";

import { Icon } from "./Icon";
import { Card, CardContent } from "./Card";

type Feature = {
  title: string;
  description: string;
  icon: string;
  highlight?: boolean;
};

type FeatureCardProps = {
  feature: Feature;
  className?: string;
};

export function FeatureCard({ feature, className = "" }: FeatureCardProps) {
  return (
    <Card variant={feature.highlight ? "interactive" : "default"} className={`flex flex-col h-full ${className}`}>
      <CardContent className="flex flex-col h-full p-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-river/10 text-river mb-4" aria-hidden="true">
          <Icon name={feature.icon} size={24} />
        </div>
        <h3 className="font-display text-xl font-semibold text-taiga mb-2">{feature.title}</h3>
        <p className="text-frost leading-relaxed flex-1">{feature.description}</p>
      </CardContent>
    </Card>
  );
}

type FeaturesGridProps = {
  features: Feature[];
  title: string;
  subtitle?: string;
  className?: string;
};

export function FeaturesGrid({ features, title, subtitle, className = "" }: FeaturesGridProps) {
  return (
    <section className={`py-16 md:py-24 ${className}`} aria-labelledby={title.toLowerCase().replace(/\s+/g, "-")}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in-up">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-taiga mb-4">{title}</h2>
          {subtitle && <p className="text-frost text-lg">{subtitle}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list">
          {features.map((feature, index) => (
            <div key={feature.title} className="animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }} role="listitem">
              <FeatureCard feature={feature} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}