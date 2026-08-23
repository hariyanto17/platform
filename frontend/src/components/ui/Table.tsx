import React from "react";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export function Table<T extends { id: string | number }>({
  columns,
  data,
  isLoading = false,
  emptyMessage,
}: TableProps<T>) {
  return (
    <div className="w-full border border-border rounded-xl overflow-hidden bg-surface shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-surface-secondary border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3.5 font-bold text-text-secondary select-none tracking-wider text-xs uppercase"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Spinner />
                    <span className="text-xs text-text-muted">Memuat data...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12">
                  <EmptyState description={emptyMessage} />
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-surface-secondary/40 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-6 py-4 text-text-primary font-medium"
                    >
                      {col.render ? col.render(item) : ((item as Record<string, unknown>)[col.key] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
