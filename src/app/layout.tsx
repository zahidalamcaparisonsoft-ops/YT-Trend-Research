import "./globals.css";
import type { Metadata, Viewport } from "next";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "YT Trend Research",
  description: "AI YouTube Content Command Center",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "YT Trends" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#F4F5F7",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
