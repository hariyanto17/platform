"use client";

import React from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";

export default function ApplicationsPage() {
  return (
    <PageContainer>
      <div className="text-left border-b border-border pb-4">
        <h2 className="text-xl font-bold text-text-primary tracking-tight">Application Registries</h2>
        <p className="text-xs text-text-muted">Kelola integrasi sub-aplikasi yang terdaftar.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Placeholder Panel</CardTitle>
          <CardDescription className="text-xs">Fungsionalitas pendaftaran aplikasi akan datang pada Phase berikutnya.</CardDescription>
        </CardHeader>
        <CardContent className="text-left">
          <p className="text-sm text-text-secondary leading-relaxed">
            Halaman ini memetakan endpoint webhook dan kredensial API untuk modul Consession & Ticketing.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
