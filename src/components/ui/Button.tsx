import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-body font-medium rounded-lg transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-river focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        default: "bg-river text-white hover:bg-river-hover",
        secondary: "bg-white text-taiga border border-fog hover:border-river hover:text-river hover:bg-river-light",
        ghost: "bg-transparent text-frost-dark hover:bg-fog/60 hover:text-taiga",
        danger: "bg-ember text-white hover:bg-ember/90",
        outline: "border border-fog bg-transparent text-taiga hover:border-river hover:text-river",
      },
      size: {
        sm: "px-3 py-1.5 text-sm min-h-[40px]",
        md: "px-4 py-2 text-sm md:text-[15px] min-h-[44px]",
        lg: "px-5 py-2.5 text-base min-h-[46px]",
        xl: "px-6 py-3 text-base min-h-[48px]",
        icon: "p-2 min-h-[40px] min-w-[40px]",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, asChild = false, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="animate-spin h-4 w-4" strokeWidth={2} aria-hidden="true" />}
        {children}
      </Comp>
    );
  }
);

Button.displayName = "Button";