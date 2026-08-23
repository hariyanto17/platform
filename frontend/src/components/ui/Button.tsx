import React, { forwardRef } from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = "primary", isLoading, className = "", disabled, ...props }, ref) => {
    const baseStyle =
      "inline-flex items-center justify-center rounded-md text-sm font-semibold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 select-none cursor-pointer";

    const variants = {
      primary:
        "bg-primary hover:bg-primary-hover active:bg-primary-active text-white shadow-md shadow-primary/10 focus-visible:outline-primary",
      secondary:
        "bg-surface-secondary hover:bg-surface border border-border text-text-primary focus-visible:outline-text-primary",
      danger:
        "bg-error hover:bg-error/90 active:bg-error/85 text-white shadow-md shadow-error/10 focus-visible:outline-error",
      ghost:
        "bg-transparent hover:bg-surface-secondary text-text-secondary hover:text-text-primary focus-visible:outline-text-secondary",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyle} ${variants[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : null}
        <span>{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";
