import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "YT Trend Research",
  description: "AI YouTube Content Command Center",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="max-w-5xl mx-auto px-5 py-6">{children}</div>
      </body>
    </html>
  );
}
