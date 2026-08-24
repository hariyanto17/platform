/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect } from "react";
import { useGetSettingsQuery, useUpdateSettingsMutation } from "@/lib/api/settingsApi";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { CheckCircle2, AlertCircle, Save } from "lucide-react";

export default function SettingsPage() {
  const { data: settingsResponse, isLoading } = useGetSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateSettingsMutation();

  const [platformName, setPlatformName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Makassar");
  const [currency, setCurrency] = useState("IDR");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [timeFormat, setTimeFormat] = useState("HH:mm");

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (settingsResponse?.data) {
      const data = settingsResponse.data;
      setPlatformName(data.platform_name || "");
      setTimezone(data.timezone || "Asia/Makassar");
      setCurrency(data.currency || "IDR");
      setDateFormat(data.date_format || "DD/MM/YYYY");
      setTimeFormat(data.time_format || "HH:mm");
    }
  }, [settingsResponse]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    setSaveError(null);

    try {
      await updateSettings({
        platform_name: platformName,
        timezone,
        currency,
        date_format: dateFormat,
        time_format: timeFormat,
      }).unwrap();

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      const errorPayload = err as { data?: { message?: string } };
      setSaveError(errorPayload?.data?.message || "Gagal menyimpan konfigurasi sistem.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan Platform</h1>
        <p className="text-sm text-text-muted">
          Kelola konfigurasi regional dan preferensi platform portal utama secara terpusat.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6 text-left">
              {/* Feedback States */}
              {saveSuccess && (
                <div className="flex items-center gap-2 p-3.5 bg-success-soft text-success rounded-xl border border-success/20 text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>Konfigurasi platform berhasil diperbarui!</span>
                </div>
              )}

              {saveError && (
                <div className="flex items-center gap-2 p-3.5 bg-error-soft text-error rounded-xl border border-error/20 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* General Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted border-b border-border pb-1.5">
                  Platform Utama
                </h3>
                <Input
                  label="Nama Platform"
                  required
                  placeholder="Planet Cinema"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Zona Waktu Utama"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    <option value="Asia/Jakarta">WIB (Asia/Jakarta)</option>
                    <option value="Asia/Makassar">WITA (Asia/Makassar)</option>
                    <option value="Asia/Jayapura">WIT (Asia/Jayapura)</option>
                  </Select>

                  <Select
                    label="Mata Uang Default"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="IDR">IDR (Rupiah)</option>
                    <option value="USD">USD (Dolar)</option>
                    <option value="SGD">SGD (Dolar Singapura)</option>
                  </Select>
                </div>
              </div>

              {/* Regional Formats */}
              <div className="space-y-4 pt-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted border-b border-border pb-1.5">
                  Format Regional & Tampilan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Format Tanggal"
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                  >
                    <option value="DD/MM/YYYY">Hari/Bulan/Tahun (DD/MM/YYYY)</option>
                    <option value="YYYY-MM-DD">Tahun-Bulan-Hari (YYYY-MM-DD)</option>
                    <option value="DD-MM-YYYY">Hari-Bulan-Tahun (DD-MM-YYYY)</option>
                  </Select>

                  <Select
                    label="Format Waktu"
                    value={timeFormat}
                    onChange={(e) => setTimeFormat(e.target.value)}
                  >
                    <option value="HH:mm">24 Jam (HH:mm)</option>
                    <option value="hh:mm A">12 Jam AM/PM (hh:mm A)</option>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border/65">
                <Button variant="primary" type="submit" disabled={isSaving} className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
