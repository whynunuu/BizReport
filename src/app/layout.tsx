import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  title: "BizReport - Sistem Laporan Harian & Dashboard Bisnis FnB / Sales",
  description:
    "Sistem pelaporan harian shift kasir, rekonsiliasi kas laci, audit order per bill, dan analitik bisnis terintegrasi.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`dark ${plusJakarta.variable}`}>
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased font-sans selection:bg-zinc-700 selection:text-white">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
