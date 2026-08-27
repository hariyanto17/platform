import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../providers/ThemeProvider";
import { LanguageProvider } from "../providers/LanguageProvider";
import { AuthProvider } from "../providers/AuthProvider";
import { ReduxProvider } from "../providers/ReduxProvider";
import { ToastProvider } from "../providers/ToastProvider";
import { AppShell } from "../components/layout/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Planet Cinema Platform",
  description: "Centralized Management & Operations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme') || 'system';
                  var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (dark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col font-sans antialiased text-text-primary`}>
        <ReduxProvider>
          <LanguageProvider>
            <ThemeProvider>
              <AuthProvider>
                <ToastProvider>
                  <AppShell>{children}</AppShell>
                </ToastProvider>
              </AuthProvider>
            </ThemeProvider>
          </LanguageProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
