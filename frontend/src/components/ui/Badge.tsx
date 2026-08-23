import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "success" | "warning" | "destructive" | "info";
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = "default", className = "", ...props }) => {
  const baseStyle =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold select-none border transition-colors";

  const variants = {
    default: "bg-surface-secondary text-text-secondary border-border",
    primary: "bg-primary-soft text-primary border-primary/20",
    success: "bg-success-soft text-success border-success/20",
    warning: "bg-warning-soft text-warning border-warning/20",
    destructive: "bg-error-soft text-error border-error/20",
    info: "bg-info-soft text-info border-info/20",
  };

  return (
    <span className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
};
