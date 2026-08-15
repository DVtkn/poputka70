import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
  {
    variants: {
      variant: {
        default: "bg-river-light text-river",
        birch: "bg-[#FEF3E2] text-birch",
        frost: "bg-fog text-frost",
        ember: "bg-ember/10 text-ember",
        green: "bg-river-light text-river",
        gray: "bg-fog text-frost",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return <span ref={ref} className={badgeVariants({ variant, className })} {...props} />;
  }
);

Badge.displayName = "Badge";