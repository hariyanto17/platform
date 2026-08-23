import React, { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  helperText?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, required, helperText, error, id, className = "", ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const ariaDescribedBy = [
      error ? errorId : null,
      helperText ? helperId : null
    ].filter(Boolean).join(" ") || undefined;

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold text-text-secondary select-none">
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={ariaDescribedBy}
          className={`w-full px-3 py-2 bg-surface border ${
            error
              ? "border-error focus:border-error focus:ring-4 focus:ring-error/15"
              : "border-border focus:border-primary focus:ring-4 focus:ring-primary/15"
          } rounded-md text-text-primary placeholder-text-muted outline-none transition duration-200 text-sm disabled:bg-surface-secondary disabled:text-text-muted disabled:cursor-not-allowed ${className}`}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-xs text-error font-medium">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-text-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
