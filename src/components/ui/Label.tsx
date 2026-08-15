import { forwardRef } from "react";

export const Label = forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => {
    return <label ref={ref} className={`label ${className}`} {...props} />;
  }
);

Label.displayName = "Label";