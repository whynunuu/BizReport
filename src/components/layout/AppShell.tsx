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
  Camera,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  ShoppingBag,
  Sparkles,
  MessageSquare,
  FolderGit2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import AdminShiftDropdown from "@/components/crm/AdminShiftDropdown";


interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState("");
  const [activeBranch, setActiveBranch] = useState("Foxe Studio - Studio 1");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Restore sidebar collapse state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("foxe_sidebar_collapsed");
      if (saved !== null) {
        setIsSidebarCollapsed(saved === "true");
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("foxe_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

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
      name: "Dashboard Studio",
      href: "/dashboard",
      icon: LayoutDashboard,
      badge: "Owner",
    },
    {
      name: "Terminal Booking (POS)",
      href: "/pos",
      icon: Camera,
      badge: "Kasir",
    },
    {
      name: "Jadwal & Sesi Foto",
      href: "/orders",
      icon: ReceiptText,
      badge: "Live",
    },
    {
      name: "Closing Shift Studio",
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
    {
      name: "WhatsApp CRM & Leads",
      href: "/crm",
      icon: MessageSquare,
      badge: "AI",
    },
    {
      name: "Raw Files & Prioritas",
      href: "/raw-files",
      icon: FolderGit2,
      badge: "Hub",
    },
  ];


  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row">
      {/* SIDEBAR UNTUK LAPTOP / DESKTOP (COLLAPSIBLE / SLIDE) */}
      <aside
        className={`hidden md:flex flex-col bg-zinc-900 border-r border-zinc-800 shadow-xs shrink-0 min-h-screen transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Brand Header & Toggle */}
        <div
          className={`border-b border-zinc-800 flex items-center transition-all ${
            isSidebarCollapsed ? "p-3 flex-col gap-2 justify-center" : "p-4 justify-between"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <h1 className="font-bold text-white leading-tight truncate">Foxe Studio</h1>
                <p className="text-2xs text-zinc-400 font-medium truncate">Studio Operating System</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            title={isSidebarCollapsed ? "Buka menu samping" : "Sembunyikan menu samping"}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-white" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-zinc-400" />
            )}
          </button>
        </div>

        {/* Branch / Studio Room Indicator */}
        {!isSidebarCollapsed ? (
          <div className="p-3 mx-3 my-2.5 bg-zinc-950 rounded-xl border border-zinc-800">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span className="flex items-center gap-1 font-medium text-[11px] text-zinc-300">
                <Store className="w-3.5 h-3.5 text-zinc-400" /> Studio Aktif
              </span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-zinc-800 text-zinc-200 border border-zinc-700">
                Online
              </span>
            </div>
            <select
              value={activeBranch}
              onChange={(e) => setActiveBranch(e.target.value)}
              className="w-full text-xs font-semibold bg-transparent text-white border-none p-0 focus:ring-0 cursor-pointer"
            >
              <option value="Foxe Studio - Studio 1" className="bg-zinc-900 text-white">Foxe Studio - Studio 1</option>
              <option value="Foxe Studio - Studio 2" className="bg-zinc-900 text-white">Foxe Studio - Studio 2</option>
              <option value="Foxe Studio - Photofox Box" className="bg-zinc-900 text-white">Foxe Studio - Photofox Box</option>
            </select>
          </div>
        ) : (
          <div className="p-2 mx-1 my-2 flex justify-center" title={`Studio Aktif: ${activeBranch}`}>
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300 border border-zinc-700">
              <Store className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 px-2 py-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isSidebarCollapsed ? `${item.name} (${item.badge})` : undefined}
                className={`flex items-center ${
                  isSidebarCollapsed ? "justify-center px-2 py-2.5" : "justify-between px-3 py-2.5"
                } rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-800 text-white font-bold border-l-4 border-white shadow-xs"
                    : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? "text-white" : "text-zinc-500"
                    }`}
                  />
                  {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                </div>
                {!isSidebarCollapsed && item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                      isActive
                        ? "bg-zinc-700 text-white"
                        : "bg-zinc-800/80 text-zinc-400 border border-zinc-700/50"
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
        <div
          className={`p-3 border-t border-zinc-800 text-xs text-zinc-500 flex items-center ${
            isSidebarCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          <span className="flex items-center gap-1.5" title="Studio Siap">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            {!isSidebarCollapsed && <span className="text-zinc-400">Studio Siap</span>}
          </span>
          {!isSidebarCollapsed && <span className="font-mono text-[11px] text-zinc-500">v1.4</span>}
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden bg-zinc-950">
        {/* TOPBAR (DESKTOP & MOBILE) */}
        <header className="sticky top-0 z-30 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center justify-between shadow-xs">
          {/* Mobile brand */}
          <div className="flex items-center gap-2.5 md:hidden">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-sm block leading-none">
                Foxe Studio
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">
                {activeBranch.split(" - ")[1] || "Studio 1"}
              </span>
            </div>
          </div>

          {/* Desktop header title & sidebar toggle button */}
          <div className="hidden md:flex items-center gap-2 text-sm text-zinc-400">
            <button
              type="button"
              onClick={toggleSidebar}
              title={isSidebarCollapsed ? "Buka menu samping" : "Sembunyikan menu samping"}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer mr-1"
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-white" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-zinc-400" />
              )}
            </button>
            <Store className="w-4 h-4 text-zinc-500" />
            <span className="font-medium text-zinc-200">{activeBranch}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs bg-zinc-800 text-zinc-300 border border-zinc-700/60 px-2 py-0.5 rounded-full">
              Sistem Manajemen &amp; Booking Studio Aktif
            </span>
          </div>

          {/* Right Header items */}
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <AdminShiftDropdown />
            <div className="hidden sm:flex items-center gap-1.5 font-mono bg-zinc-800 border border-zinc-700/80 text-zinc-200 px-2.5 py-1 rounded-md">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>{currentTime}</span>
            </div>
            <Link
              href="/pos"
              className="bg-white hover:bg-zinc-200 text-zinc-950 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-all text-xs"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Terminal Booking</span>
            </Link>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto pb-24 md:pb-8 bg-zinc-950">
          {children}
        </main>

        {/* BOTTOM NAVIGATION BAR FOR MOBILE (HP SMARTPHONE) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-900 border-t border-zinc-800 px-1 py-1.5 flex items-center justify-around shadow-lg">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                  isActive
                    ? "text-white font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <div
                  className={`p-1 rounded-lg ${
                    isActive ? "bg-zinc-800 border border-zinc-700" : "bg-transparent"
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
