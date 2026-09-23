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
}

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export default function MonthlyCalendarTracker({
  selectedDay,
  onSelectDay,
  onOpenReport,
}: MonthlyCalendarTrackerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Group records by day (1..30)
  const dailyStats = useMemo(() => {
    const stats: Record<
      number,
      { count: number; totalRevenue: number; records: LogOrderEntry[] }
    > = {};

    logOrderDP.forEach((rec) => {
      const d = rec.day;
      if (!stats[d]) {
        stats[d] = { count: 0, totalRevenue: 0, records: [] };
      }
      stats[d].count += 1;
      stats[d].totalRevenue += rec.nominal || 0;
      stats[d].records.push(rec);
    });

    return stats;
  }, []);

  const totalMonthlyDP = logOrderDP.length;
  const totalMonthlyRevenue = useMemo(
    () => logOrderDP.reduce((acc, r) => acc + (r.nominal || 0), 0),
    []
  );

  // September 2026 starts on Tuesday (Index 1 when Monday is 0)
  // Total days in September = 30
  const daysInMonth = 30;
  const paddingEmptyDays = 1; // Tuesday is 2nd day of week (0=Mon, 1=Tue)

  const handleCellClick = (day: number) => {
    onSelectDay(day);
    onOpenReport(day);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all">
      {/* ── Calendar Header Bar ── */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Kalender Harian Studio
              </h2>
              <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                September 2026
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Klik kotak tanggal untuk membuka laporan harian per-hari &amp; filter leads
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
          {/* Active selection indicator */}
          {selectedDay && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 rounded-lg text-xs">
              <span>📅 Tgl {selectedDay} Sept Dipilih</span>
              <button
                onClick={() => onSelectDay(null)}
                className="hover:text-white ml-1 text-slate-300 cursor-pointer"
                title="Hapus saringan tanggal"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Month Total Chip */}
          <div className="text-xs font-semibold px-2.5 py-1 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-200 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>{totalMonthlyDP} DP (Rp {totalMonthlyRevenue.toLocaleString("id-ID")})</span>
          </div>

          {/* Collapse / Expand Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
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
        <div className="p-4 space-y-2">
          {/* Weekday Header */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-400 pb-1 border-b border-slate-100">
            {WEEKDAYS.map((wd, idx) => (
              <div
                key={wd}
                className={idx >= 5 ? "text-rose-500 font-extrabold" : "text-slate-600"}
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
                className="min-h-[58px] sm:min-h-[64px] bg-slate-50/50 rounded-xl border border-dashed border-slate-200/60 p-1.5 opacity-40"
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
              const isToday = day === 23; // Hari ini (23 September 2026)

              return (
                <div
                  key={`day-${day}`}
                  onClick={() => handleCellClick(day)}
                  className={`min-h-[58px] sm:min-h-[64px] p-1.5 rounded-xl border transition-all flex flex-col justify-between cursor-pointer group ${
                    isSelected
                      ? "bg-emerald-50 border-emerald-500 shadow-sm ring-2 ring-emerald-400/80"
                      : isToday
                      ? "bg-amber-50/60 border-amber-300 hover:border-amber-400 shadow-2xs"
                      : data
                      ? "bg-white border-slate-200/90 hover:border-emerald-300 hover:bg-slate-50/80 shadow-2xs"
                      : "bg-slate-50/40 border-slate-100 hover:border-slate-300 text-slate-400"
                  }`}
                  title={`Klik untuk melihat laporan harian tanggal ${day} September 2026`}
                >
                  {/* Top Bar: Date number + Today badge */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold inline-flex items-center justify-center w-5 h-5 rounded-full ${
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : isToday
                          ? "bg-amber-500 text-white"
                          : isWeekend
                          ? "text-rose-600 bg-rose-50"
                          : "text-slate-800"
                      }`}
                    >
                      {day}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 rounded-sm">
                        Hari Ini
                      </span>
                    )}
                  </div>

                  {/* DP Indicator & Revenue */}
                  {data ? (
                    <div className="mt-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                          <span>✓</span>
                          <span>{data.count} DP</span>
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 truncate">
                        Rp {(data.totalRevenue / 1000).toLocaleString("id-ID")}rb
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-300 italic">-</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom helper bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between text-2xs text-slate-500 gap-1.5 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Ada Transaksi DP Sah</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Hari Ini (23 Sept)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Weekend</span>
              </span>
            </div>
            {selectedDay ? (
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 font-semibold">
                  Menampilkan leads khusus tgl {selectedDay} Sept
                </span>
                <button
                  onClick={() => onOpenReport(selectedDay)}
                  className="font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                >
                  Buka Laporan Harian →
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleCellClick(23)}
                className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <FileText className="w-3 h-3" />
                <span>Buka Laporan Hari Ini (23 Sept) →</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
