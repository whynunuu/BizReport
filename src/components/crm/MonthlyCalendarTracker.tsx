"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Sparkles,
  FileText,
  RotateCcw,
} from "lucide-react";
import logOrderRaw from "@/data/log_order_dp.json";
import { LogOrderEntry } from "./DailyReportModal";

const logOrderDP = logOrderRaw as LogOrderEntry[];

interface MonthlyCalendarTrackerProps {
  selectedDay: number | null;
  onSelectDay: (day: number | null) => void;
  onOpenReport: (day: number) => void;
  leads?: any[];
}

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export default function MonthlyCalendarTracker({
  selectedDay,
  onSelectDay,
  onOpenReport,
  leads = [],
}: MonthlyCalendarTrackerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Group records by day (1..30) dynamically combining static JSON & live DB leads
  const dailyStats = useMemo(() => {
    const stats: Record<
      number,
      { count: number; totalRevenue: number; records: LogOrderEntry[] }
    > = {};

    // 1. Static records from log_order_dp.json
    logOrderDP.forEach((rec) => {
      const d = rec.day;
      if (!stats[d]) {
        stats[d] = { count: 0, totalRevenue: 0, records: [] };
      }
      stats[d].count += 1;
      stats[d].totalRevenue += rec.nominal || 100000;
      stats[d].records.push(rec);
    });

    // 2. Dynamic live DB leads
    if (Array.isArray(leads) && leads.length > 0) {
      leads.forEach((l) => {
        const isBooking = l.status === "BOOKING" || l.hasBooking || l.source === "LOG_ORDER" || Boolean(l.revenue && l.revenue > 0);
        if (!isBooking) return;

        let day: number | null = null;

        if (l.phoneNumber && l.phoneNumber.startsWith("62800")) {
          const dayStr = l.phoneNumber.substring(5, 7);
          const parsed = parseInt(dayStr, 10);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 31) {
            day = parsed;
          }
        }

        if (day === null && l.bookingNotes) {
          const match = l.bookingNotes.match(/Log Order Day (\d+)/i);
          if (match) {
            day = parseInt(match[1], 10);
          }
        }

        if (day === null && l.lastBookingDate) {
          const d = new Date(l.lastBookingDate);
          if (!isNaN(d.getTime())) day = d.getDate();
        }

        if (day === null && l.updatedAt) {
          const d = new Date(l.updatedAt);
          if (!isNaN(d.getTime())) day = d.getDate();
        }

        if (day !== null && day >= 1 && day <= 31) {
          const lClean = (l.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const alreadyInRecords = Boolean(
            lClean &&
            stats[day]?.records.some(
              (r) => r.client.toLowerCase().replace(/[^a-z0-9]/g, "") === lClean
            )
          );

          if (!alreadyInRecords) {
            if (!stats[day]) {
              stats[day] = { count: 0, totalRevenue: 0, records: [] };
            }
            const nom = l.revenue && l.revenue > 0 ? l.revenue : 100000;
            const newEntry: LogOrderEntry = {
              day,
              date: `2026-09-${String(day).padStart(2, "0")}`,
              client: l.name || "Customer",
              paket: l.bookingNotes || "Photofox",
              nominal: nom,
              admin: l.closingAdmin || l.leadOwner || "Admin Studio",
            };
            stats[day].count += 1;
            stats[day].totalRevenue += nom;
            stats[day].records.push(newEntry);
          }
        }
      });
    }

    return stats;
  }, [leads]);

  const totalMonthlyDP = useMemo(() => {
    return Object.values(dailyStats).reduce((acc, s) => acc + s.count, 0);
  }, [dailyStats]);

  const totalMonthlyRevenue = useMemo(() => {
    return Object.values(dailyStats).reduce((acc, s) => acc + s.totalRevenue, 0);
  }, [dailyStats]);

  // September 2026 starts on Tuesday (Index 1 when Monday is 0)
  // Total days in September = 30
  const daysInMonth = 30;
  const paddingEmptyDays = 1; // Tuesday is 2nd day of week (0=Mon, 1=Tue)

  const handleCellClick = (day: number) => {
    onSelectDay(day);
    onOpenReport(day);
  };

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xs overflow-hidden transition-all text-white">
      {/* ── Calendar Header Bar ── */}
      <div className="px-5 py-3.5 bg-zinc-950 border-b border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Kalender Harian Studio
              </h2>
              <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                September 2026
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Klik kotak tanggal untuk membuka laporan harian per-hari &amp; filter leads
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
          {/* Active selection indicator */}
          {selectedDay && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 border border-zinc-700 text-white rounded-lg text-xs font-semibold">
              <span>📅 Tgl {selectedDay} Sept Dipilih</span>
              <button
                onClick={() => onSelectDay(null)}
                className="hover:text-zinc-300 ml-1 text-zinc-400 cursor-pointer"
                title="Hapus saringan tanggal"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Month Total Chip */}
          <div className="text-xs font-semibold px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 flex items-center gap-1.5 font-mono">
            <TrendingUp className="w-3.5 h-3.5 text-zinc-300" />
            <span>{totalMonthlyDP} DP (Rp {totalMonthlyRevenue.toLocaleString("id-ID")})</span>
          </div>

          {/* Collapse / Expand Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors cursor-pointer border border-zinc-700"
            title={isCollapsed ? "Tampilkan kalender penuh" : "Sembunyikan kalender"}
          >
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* ── Collapsible Calendar Body ── */}
      {!isCollapsed && (
        <div className="p-4 space-y-2 bg-zinc-900">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-zinc-400 pb-1.5 border-b border-zinc-800">
            {WEEKDAYS.map((wd, idx) => (
              <div
                key={wd}
                className={idx >= 5 ? "text-zinc-300 font-extrabold" : "text-zinc-400"}
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Day Grid Cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* 1. Empty padding before Sept 1 (Tuesday) */}
            {Array.from({ length: paddingEmptyDays }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="min-h-[58px] sm:min-h-[64px] bg-zinc-950/60 rounded-xl border border-dashed border-zinc-800/80 p-1.5 opacity-30"
              />
            ))}

            {/* 2. Days 1 to 30 */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const dateObj = new Date(2026, 8, day);
              const dayOfWeek = dateObj.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const data = dailyStats[day];
              const isSelected = selectedDay === day;
              const isToday = day === 24; // Hari ini (24 September 2026)

              return (
                <div
                  key={`day-${day}`}
                  onClick={() => handleCellClick(day)}
                  className={`min-h-[58px] sm:min-h-[64px] p-1.5 rounded-xl border transition-all flex flex-col justify-between cursor-pointer group ${
                    isSelected
                      ? "bg-zinc-800 border-white shadow-sm ring-2 ring-zinc-400/50"
                      : isToday
                      ? "bg-zinc-800/90 border-zinc-600 hover:border-zinc-400 shadow-2xs"
                      : data
                      ? "bg-zinc-950/80 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/60 shadow-2xs"
                      : "bg-zinc-950/40 border-zinc-800/50 hover:border-zinc-700 text-zinc-500"
                  }`}
                  title={`Klik untuk melihat laporan harian tanggal ${day} September 2026`}
                >
                  {/* Top Bar: Date number + Today badge */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold inline-flex items-center justify-center w-5 h-5 rounded-full ${
                        isSelected
                          ? "bg-white text-zinc-950 font-black"
                          : isToday
                          ? "bg-zinc-700 text-white border border-zinc-500"
                          : isWeekend
                          ? "text-zinc-300 bg-zinc-800/80"
                          : "text-zinc-300"
                      }`}
                    >
                      {day}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.2 rounded border border-zinc-700">
                        Hari Ini
                      </span>
                    )}
                  </div>

                  {/* DP Indicator & Revenue */}
                  {data ? (
                    <div className="mt-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center gap-0.5">
                          <span>✓</span>
                          <span>{data.count} DP</span>
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400 truncate">
                        Rp {(data.totalRevenue / 1000).toLocaleString("id-ID")}rb
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-zinc-600 italic">-</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom helper bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between text-2xs text-zinc-400 gap-1.5 border-t border-zinc-800">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-white" />
                <span>Ada Transaksi DP Sah</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-zinc-500" />
                <span>Hari Ini (24 Sept)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-zinc-700" />
                <span>Weekend</span>
              </span>
            </div>
            {selectedDay ? (
              <div className="flex items-center gap-2">
                <span className="text-zinc-300 font-semibold">
                  Menampilkan leads khusus tgl {selectedDay} Sept
                </span>
                <button
                  onClick={() => onOpenReport(selectedDay)}
                  className="font-bold text-white hover:text-zinc-300 underline cursor-pointer"
                >
                  Buka Laporan Harian →
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleCellClick(24)}
                className="font-semibold text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <FileText className="w-3 h-3" />
                <span>Buka Laporan Hari Ini (24 Sept) →</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
