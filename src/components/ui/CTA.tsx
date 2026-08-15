"use client";

import Link from "next/link";
import { Icon } from "./Icon";

type CTAProps = {
  title: string;
  description?: string;
  primaryAction: {
    label: string;
    href: string;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
  variant?: "default" | "gradient" | "dark";
  className?: string;
};

export default function CTA({
  title,
  description,
  primaryAction,
  secondaryAction,
  variant = "default",
  className = "",
}: CTAProps) {
  const variants = {
    default: "bg-white border border-fog",
    gradient: "bg-gradient-to-br from-river to-river-light text-white",
    dark: "bg-taiga text-white",
  };

  const textColors = {
    default: "text-taiga",
    gradient: "text-white",
    dark: "text-white",
  };

  const mutedColors = {
    default: "text-frost",
    gradient: "text-white/80",
    dark: "text-frost",
  };

  const buttonStyles = (isPrimary: boolean) => {
    const base = "inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 w-full sm:w-auto";
    
    if (variant === "default") {
      return isPrimary
        ? `${base} bg-river text-white hover:bg-[#163d50] focus:ring-river`
        : `${base} bg-white text-taiga border border-fog hover:border-river hover:text-river focus:ring-river`;
    }
    
    if (variant === "gradient") {
      return isPrimary
        ? `${base} bg-white text-river hover:bg-fog focus:ring-white`
        : `${base} bg-transparent border-2 border-white text-white hover:bg-white/10 focus:ring-white`;
    }
    
    return isPrimary
      ? `${base} bg-white text-taiga hover:bg-fog focus:ring-white`
      : `${base} bg-transparent border-2 border-white text-white hover:bg-white/10 focus:ring-white`;
  };

  return (
    <section
      className={`relative rounded-3xl p-8 md:p-12 lg:p-16 ${variants[variant]} ${textColors[variant]} ${className}`}
      aria-labelledby="cta-title"
    >
      {variant === "gradient" && (
        <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-river/20 via-transparent to-transparent" aria-hidden="true" />
      )}
      <div className="relative max-w-3xl mx-auto text-center">
        <h2 id="cta-title" className="font-display text-3xl md:text-4xl font-bold mb-4 animate-fade-in-up">
          {title}
        </h2>
        {description && (
          <p className={`text-lg md:text-xl mb-8 max-w-2xl mx-auto ${mutedColors[variant]} animate-fade-in-up`} style={{ animationDelay: "100ms" }}>
            {description}
          </p>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <Link
            href={primaryAction.href}
            className={buttonStyles(true)}
          >
            {primaryAction.label}
            <Icon name="arrowRight" size={20} aria-hidden="true" />
          </Link>
          {secondaryAction && (
            <Link
              href={secondaryAction.href}
              className={buttonStyles(false)}
            >
              {secondaryAction.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}