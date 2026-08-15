import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-body font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-river focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        default: "bg-river text-white hover:bg-river-hover hover:-translate-y-0.5 hover:shadow-river active:translate-y-0",
        secondary: "bg-white text-taiga border border-fog hover:border-river hover:text-river hover:bg-river-light",
        ghost: "bg-transparent text-frost hover:bg-fog hover:text-taiga",
        danger: "bg-ember text-white hover:bg-ember/90 hover:-translate-y-0.5",
        outline: "border-2 border-fog bg-transparent hover:border-river hover:text-river",
      },
      size: {
        sm: "px-3 py-1.5 text-sm min-h-[40px]",
        md: "px-5 py-2.5 text-base min-h-[48px]",
        lg: "px-6 py-3 text-base min-h-[52px]",
        xl: "px-8 py-4 text-lg min-h-[56px]",
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
        className={buttonVariants({ variant, size, fullWidth, className })}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </Comp>
    );
  }
);

Button.displayName = "Button";