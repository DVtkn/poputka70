import { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string | boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    const hasError = Boolean(error);
    return (
      <input
        ref={ref}
        className={`input ${hasError ? "input-error" : ""} ${className}`}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${props.id}-error` : undefined}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";