"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useLoginMutation } from "@/lib/api/authApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Film, Globe } from "lucide-react";
import { useTranslation, localeOptions } from "@/providers/LanguageProvider";

export default function LoginPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useTranslation();
  const [login, { isLoading }] = useLoginMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await login({ email, password }).unwrap();
      router.push("/");
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      setError(errorObj.data?.message || errorObj.message || t("auth.invalidCredentials"));
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 relative">
      {/* Language Selector Top Right */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <Globe className="w-4 h-4 text-text-muted" />
        <div className="flex gap-1">
          {localeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setLocale(opt.value)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                locale === opt.value
                  ? "bg-primary text-white"
                  : "bg-surface-secondary text-text-secondary hover:bg-surface border border-border"
              }`}
            >
              {opt.value.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Film className="w-8 h-8 text-primary" />
          <span className="text-xl font-bold text-text-primary tracking-wide">
            {t("auth.loginTitle")}
          </span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>{t("common.signIn")}</CardTitle>
            <CardDescription>
              {t("auth.loginSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-error bg-error/10 border border-error/20 rounded-md">
                  {error}
                </div>
              )}

              <Input
                label={t("auth.emailLabel")}
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />

              <Input
                label={t("auth.passwordLabel")}
                type="password"
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />

              <Button
                type="submit"
                className="w-full mt-2"
                isLoading={isLoading}
              >
                {t("auth.loginButton")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
