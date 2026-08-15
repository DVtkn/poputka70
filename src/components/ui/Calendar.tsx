"use client";

import * as React from "react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "react-day-picker/style.css";

type CalendarProps = Omit<DayPickerProps, "components"> & {
  className?: string;
};

export function Calendar({ className, ...props }: CalendarProps) {
  return (
    <DayPicker
      {...(props as DayPickerProps)}
      className={cn("p-3", className)}
      classNames={{
        root: "rounded-lg border border-fog bg-white",
        months: "relative",
        month_caption: "flex items-center justify-center font-semibold text-taiga py-2",
        weekdays: "flex justify-between px-2 pb-2",
        weekday: "w-9 text-xs font-medium text-frost text-center",
        weeks: "flex flex-col gap-0.5",
        week: "flex",
        day: "flex h-9 w-9 items-center justify-center text-sm font-medium rounded-lg hover:bg-river-light hover:text-river transition-colors data-[selected]:bg-river data-[selected]:text-white data-[disabled]:opacity-40 data-[disabled]:pointer-events-none data-[today]:font-semibold data-[today]:text-river data-[outside]:text-frost/50",
        day_button: "h-9 w-9",
        button_previous: "absolute left-2 top-2 p-1 rounded-lg hover:bg-fog transition-colors",
        button_next: "absolute right-2 top-2 p-1 rounded-lg hover:bg-fog transition-colors",
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4 text-frost" />
          ) : (
            <ChevronRight className="h-4 w-4 text-frost" />
          ),
      }}
    />
  );
}

export { DayPicker } from "react-day-picker";