"use client";

import React from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";

export default function SettingsPage() {
  return (
    <PageContainer>
      <div className="text-left border-b border-border pb-4">
        <h2 className="text-xl font-bold text-text-primary tracking-tight">System Settings</h2>
        <p className="text-xs text-text-muted">Konfigurasi global platform utama.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Placeholder Panel</CardTitle>
          <CardDescription className="text-xs">Fungsionalitas pengaturan sistem akan datang pada Phase berikutnya.</CardDescription>
        </CardHeader>
        <CardContent className="text-left">
          <p className="text-sm text-text-secondary leading-relaxed">
            Halaman ini mengontrol SMTP mailer backend, backup scheduler, dan integrasi cloud storage.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
