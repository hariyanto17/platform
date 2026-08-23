"use client";

import React from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";

export default function AuditLogsPage() {
  return (
    <PageContainer>
      <div className="text-left border-b border-border pb-4">
        <h2 className="text-xl font-bold text-text-primary tracking-tight">System Audit Logs</h2>
        <p className="text-xs text-text-muted">Jejak audit aktivitas administrator dan sistem.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Placeholder Panel</CardTitle>
          <CardDescription className="text-xs">Fungsionalitas log audit akan datang pada Phase berikutnya.</CardDescription>
        </CardHeader>
        <CardContent className="text-left">
          <p className="text-sm text-text-secondary leading-relaxed">
            Halaman ini memonitor aktivitas write/update konfigurasi serta riwayat sesi admin.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
