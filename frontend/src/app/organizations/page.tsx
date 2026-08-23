"use client";

import React from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";

export default function OrganizationsPage() {
  return (
    <PageContainer>
      <div className="text-left border-b border-border pb-4">
        <h2 className="text-xl font-bold text-text-primary tracking-tight">Organization Configuration</h2>
        <p className="text-xs text-text-muted">Kelola grup outlet bioskop dan struktur tenant.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Placeholder Panel</CardTitle>
          <CardDescription className="text-xs">Fungsionalitas manajemen organisasi akan datang pada Phase berikutnya.</CardDescription>
        </CardHeader>
        <CardContent className="text-left">
          <p className="text-sm text-text-secondary leading-relaxed">
            Halaman ini adalah mock placeholder untuk memetakan kepemilikan tenant bioskop (Multi-tenant configuration).
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
