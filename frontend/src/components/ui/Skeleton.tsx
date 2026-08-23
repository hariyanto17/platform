import React from "react";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export const Skeleton: React.FC<SkeletonProps> = ({ className = "", ...props }) => {
  return (
    <div
      className={`animate-pulse rounded-md bg-surface-secondary border border-border/10 ${className}`}
      {...props}
    />
  );
};
