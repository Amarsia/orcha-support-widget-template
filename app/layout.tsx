import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { widgetConfig } from "@/config/widget";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: widgetConfig.name,
  description: widgetConfig.description,
  icons: { icon: [{ url: widgetConfig.icon }] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-[var(--bg-page)] text-[var(--text-primary)]">{children}</body>
    </html>
  );
}
