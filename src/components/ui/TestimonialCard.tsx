"use client";

import { Card, CardContent } from "./Card";
import { Avatar, AvatarFallback } from "./Avatar";
import { Icon } from "./Icon";

type Testimonial = {
  id: string;
  author: string;
  role: string;
  avatar?: string;
  content: string;
  rating: number;
};

type TestimonialCardProps = {
  testimonial: Testimonial;
  className?: string;
};

export function TestimonialCard({ testimonial, className = "" }: TestimonialCardProps) {
  const initials = testimonial.author.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  
  return (
    <Card variant="interactive" className={`flex flex-col h-full ${className}`}>
      <CardContent className="flex flex-col h-full p-6">
        <div className="flex items-center gap-1 mb-4" aria-label={`Рейтинг ${testimonial.rating} из 5`}>
          {[...Array(5)].map((_, i) => (
            <Icon
              key={i}
              name={i < testimonial.rating ? "star" : "star"}
              size={18}
              className={i < testimonial.rating ? "text-birch" : "text-fog"}
              fill={i < testimonial.rating ? "currentColor" : "none"}
              stroke={i < testimonial.rating ? "none" : "currentColor"}
            />
          ))}
        </div>
        <p className="text-taiga leading-relaxed mb-6 flex-1">«{testimonial.content}»</p>
        <div className="flex items-center gap-3">
          <Avatar size="md">
            <AvatarFallback>{testimonial.author.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-taiga">{testimonial.author}</p>
            <p className="text-sm text-frost">{testimonial.role}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type TestimonialsProps = {
  testimonials: Testimonial[];
  title?: string;
  subtitle?: string;
  className?: string;
};

export function Testimonials({ testimonials, title, subtitle, className = "" }: TestimonialsProps) {
  return (
    <section className={`py-16 md:py-24 ${className}`} aria-labelledby={title?.toLowerCase().replace(/\s+/g, "-")}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
        {title && (
          <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in-up">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-taiga mb-4">{title}</h2>
            {subtitle && <p className="text-frost text-lg">{subtitle}</p>}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list">
          {testimonials.map((testimonial, index) => (
            <div key={testimonial.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }} role="listitem">
              <TestimonialCard testimonial={testimonial} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}