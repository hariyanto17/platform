import React from "react";

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export const Card: React.FC<CardProps> = ({ children, className = "", ...props }) => {
  return (
    <div
      className={`rounded-lg border border-border bg-surface text-text-primary shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "", ...props }) => {
  return (
    <div className={`p-6 flex flex-col gap-1.5 border-b border-border/50 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ children, className = "", ...props }) => {
  return (
    <h3 className={`text-lg font-bold leading-none tracking-tight text-text-primary ${className}`} {...props}>
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ children, className = "", ...props }) => {
  return (
    <p className={`text-sm text-text-muted ${className}`} {...props}>
      {children}
    </p>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "", ...props }) => {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "", ...props }) => {
  return (
    <div className={`p-6 pt-0 flex items-center border-t border-border/40 mt-4 ${className}`} {...props}>
      {children}
    </div>
  );
};
