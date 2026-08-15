"use client";

import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;
const SheetOverlay = SheetPrimitive.Overlay;

const SheetContent = forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & { side?: "top" | "bottom" | "left" | "right" }
>(({ className, children, side = "bottom", ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
    />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 gap-4 bg-white p-6 shadow-xl transition duration-300 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
        side === "bottom" &&
          "inset-x-0 bottom-0 rounded-t-xl border-t border-fog data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        side === "top" &&
          "inset-x-0 top-0 rounded-b-xl border-b border-fog data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        side === "left" &&
          "inset-y-0 left-0 h-full w-3/4 max-w-sm rounded-r-xl border-r border-fog data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
        side === "right" &&
          "inset-y-0 right-0 h-full w-3/4 max-w-sm rounded-l-xl border-l border-fog data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between mb-4">
        <SheetPrimitive.Close className="rounded-lg p-1 text-frost hover:text-taiga hover:bg-fog transition-colors">
          <X className="h-5 w-5" />
          <span className="visually-hidden">Закрыть</span>
        </SheetPrimitive.Close>
      </div>
      {children}
    </SheetPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn("font-display text-xl font-semibold text-taiga", className)} {...props} />
  )
);
SheetTitle.displayName = "SheetTitle";

const SheetDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-frost", className)} {...props} />
  )
);
SheetDescription.displayName = "SheetDescription";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};