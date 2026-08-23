import React from "react";
import { Info } from "lucide-react";

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "Tidak Ada Data",
  description = "Belum ada item yang terdaftar di halaman ini.",
  icon = <Info className="w-8 h-8 text-text-muted" />,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-surface rounded-xl border border-dashed border-border/80 max-w-sm mx-auto">
      <div className="p-3 bg-surface-secondary rounded-full mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-text-primary mb-1">
        {title}
      </h3>
      <p className="text-xs text-text-muted">
        {description}
      </p>
    </div>
  );
};
