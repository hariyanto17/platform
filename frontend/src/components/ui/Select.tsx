import React, { forwardRef } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  required?: boolean;
  options?: SelectOption[];
  error?: string;
  helperText?: string;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, required, options = [], error, helperText, placeholder, id, className = "", children, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

    const ariaDescribedBy = [
      error ? errorId : null,
      helperText ? helperId : null
    ].filter(Boolean).join(" ") || undefined;

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={selectId} className="text-sm font-semibold text-text-secondary select-none">
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          aria-describedby={ariaDescribedBy}
          className={`w-full px-3 py-2 bg-surface border ${
            error
              ? "border-error focus:border-error focus:ring-4 focus:ring-error/15"
              : "border-border focus:border-primary focus:ring-4 focus:ring-primary/15"
          } rounded-md text-text-primary outline-none transition duration-200 text-sm disabled:bg-surface-secondary disabled:text-text-muted disabled:cursor-not-allowed ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children ? children : options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
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

Select.displayName = "Select";
