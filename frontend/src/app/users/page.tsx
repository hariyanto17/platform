"use client";

import React from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function UsersPage() {
  return (
    <PageContainer>
      <div className="text-left border-b border-border pb-4">
        <h2 className="text-xl font-bold text-text-primary tracking-tight">User Management</h2>
        <p className="text-xs text-text-muted">Kelola akun administrator dan kasir outlet.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Placeholder Panel</CardTitle>
          <CardDescription className="text-xs">Fungsionalitas manajemen pengguna akan datang pada Phase berikutnya.</CardDescription>
        </CardHeader>
        <CardContent className="text-left">
          <p className="text-sm text-text-secondary leading-relaxed">
            Halaman ini adalah mock placeholder untuk integrasi otentikasi serta role permission sistem central.
          </p>
          <Button variant="primary" className="mt-4" onClick={() => alert("Coming soon in Phase 2!")}>
            Tambah Pengguna Baru
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
