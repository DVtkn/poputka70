import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circular" | "rectangular";
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "rounded-lg",
      circular: "rounded-full",
      rectangular: "rounded-lg",
    };
    return (
      <div
        ref={ref}
        className={cn("skeleton", variants[variant], className)}
        {...props}
      />
    );
  }
);

Skeleton.displayName = "Skeleton";