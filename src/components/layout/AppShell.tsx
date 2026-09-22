"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardPenLine,
  ReceiptText,
  FileSpreadsheet,
  Store,
  Clock,
  Coffee,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState("");
  const [activeBranch, setActiveBranch] = useState("Kopi Senja - Sudirman");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString("id-ID", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    {
      name: "Dashboard Analitik",
      href: "/dashboard",
      icon: LayoutDashboard,
      badge: "Owner",
    },
    {
      name: "Kasir POS (Order)",
      href: "/pos",
      icon: ShoppingBag,
      badge: "Kasir",
    },
    {
      name: "Daftar Order / Bill",
      href: "/orders",
      icon: ReceiptText,
      badge: "Live",
    },
    {
      name: "Input Closing Shift",
      href: "/input",
      icon: ClipboardPenLine,
      badge: "Shift",
    },
    {
      name: "Rekap & Excel",
      href: "/reports",
      icon: FileSpreadsheet,
      badge: "Audit",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row">
      {/* SIDEBAR UNTUK LAPTOP / DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shadow-sm shrink-0 min-h-screen">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
            <Coffee className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight">BizReport</h1>
            <p className="text-xs text-slate-500 font-medium">POS & Analytics OS</p>
          </div>
        </div>

        {/* Branch / Outlet Indicator */}
        <div className="p-4 mx-3 my-3 bg-slate-50 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="flex items-center gap-1 font-medium">
              <Store className="w-3.5 h-3.5 text-amber-600" /> Outlet Aktif
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
              Online
            </span>
          </div>
          <select
            value={activeBranch}
            onChange={(e) => setActiveBranch(e.target.value)}
            className="w-full text-xs font-semibold bg-transparent text-slate-800 border-none p-0 focus:ring-0 cursor-pointer"
          >
            <option value="Kopi Senja - Sudirman">Kopi Senja - Sudirman</option>
            <option value="Kopi Senja - Senopati">Kopi Senja - Senopati</option>
            <option value="Kopi Senja - BSD">Kopi Senja - BSD</option>
          </select>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-amber-50 text-amber-900 font-semibold border-l-4 border-amber-500 shadow-xs"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 ${
                      isActive ? "text-amber-600" : "text-slate-400"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isActive
                        ? "bg-amber-200 text-amber-900"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Kasir Siap
          </span>
          <span className="font-mono text-[11px]">v1.3</span>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* TOPBAR (DESKTOP & MOBILE) */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shadow-xs">
          {/* Mobile brand */}
          <div className="flex items-center gap-2.5 md:hidden">
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm block leading-none">
                BizReport
              </span>
              <span className="text-[10px] text-amber-700 font-medium">
                {activeBranch.split(" - ")[1] || "Sudirman"}
              </span>
            </div>
          </div>

          {/* Desktop header title */}
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-600">
            <Store className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-slate-800">{activeBranch}</span>
            <span className="text-slate-300">•</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              Sistem POS & Laporan Aktif
            </span>
          </div>

          {/* Right Header items */}
          <div className="flex items-center gap-2.5 text-xs text-slate-500">
            <div className="hidden sm:flex items-center gap-1.5 font-mono bg-slate-100 px-2.5 py-1 rounded-md">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentTime}</span>
            </div>
            <Link
              href="/pos"
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all text-xs"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Buka POS Kasir</span>
            </Link>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          {children}
        </main>

        {/* BOTTOM NAVIGATION BAR FOR MOBILE (HP SMARTPHONE) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-1 py-1.5 flex items-center justify-around shadow-lg">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                  isActive
                    ? "text-amber-600 font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <div
                  className={`p-1 rounded-lg ${
                    isActive ? "bg-amber-50" : "bg-transparent"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[9px] tracking-tight mt-0.5 font-medium whitespace-nowrap">
                  {item.name.split(" ")[0]}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
