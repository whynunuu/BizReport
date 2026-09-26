"use client";

import React from "react";
import {
  X,
  Calendar,
  CheckCircle2,
  DollarSign,
  Users,
  Clock,
  ArrowRight,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { Lead } from "./CRMChatRoom";

export interface LogOrderEntry {
  day: number;
  date: string;
  client: string;
  paket: string;
  tgl_foto?: string;
  cash?: number;
  transfer?: number;
  nominal: number;
  admin: string;
}

interface DailyReportModalProps {
  day: number;
  records: LogOrderEntry[];
  leads: Lead[];
  isOpen: boolean;
  onClose: () => void;
  onSelectLeadForChat: (leadId: string) => void;
  onApplyDayFilter: (day: number) => void;
  inboundChatCount?: number;
  isAutoInbound?: boolean;
  onOpenInputChat?: (day: number) => void;
}

const INDONESIAN_DAYS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

export default function DailyReportModal({
  day,
  records,
  leads,
  isOpen,
  onClose,
  onSelectLeadForChat,
  onApplyDayFilter,
  inboundChatCount,
  isAutoInbound = true,
  onOpenInputChat,
}: DailyReportModalProps) {
  if (!isOpen) return null;

  // Determine weekday for September [day], 2026
  const dateObj = new Date(2026, 8, day);
  const dayName = INDONESIAN_DAYS[dateObj.getDay()];
  const formattedFullDate = `${dayName}, ${day} September 2026`;

  // Aggregate metrics for this day
  const totalDPCount = records.length;
  const totalRevenue = records.reduce((sum, r) => sum + (r.nominal || 0), 0);
  const effectiveInbound = inboundChatCount !== undefined && inboundChatCount > 0 ? inboundChatCount : totalDPCount;
  const closingRate = ((totalDPCount / effectiveInbound) * 100).toFixed(1);

  // Admin breakdown
  const admin1Count = records.filter(
    (r) =>
      r.admin.toUpperCase().includes("AMEL") ||
      r.admin.toUpperCase().includes("ADMIN 1")
  ).length;
  const admin2Count = records.filter(
    (r) =>
      r.admin.toUpperCase().includes("INDAH") ||
      r.admin.toUpperCase().includes("ADMIN 2")
  ).length;

  // Package breakdown
  const packageCounts: Record<string, number> = {};
  records.forEach((r) => {
    const p = r.paket || "Lainnya";
    packageCounts[p] = (packageCounts[p] || 0) + 1;
  });
  const topPackages = Object.entries(packageCounts).sort((a, b) => b[1] - a[1]);

  // Find matching CRM leads for each record
  const enrichedRecords = records.map((rec) => {
    const recNameClean = rec.client.toLowerCase().replace(/[^a-z0-9]/g, "");
    const matchedLead = leads.find((ld) => {
      const lNameClean = (ld.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (lNameClean && (lNameClean === recNameClean || lNameClean.includes(recNameClean) || recNameClean.includes(lNameClean))) {
        return true;
      }
      // Check phone match if pure log
      if (ld.phoneNumber.includes(`62800${String(rec.day).padStart(2, "0")}`)) {
        return true;
      }
      // Check notes
      if (ld.bookingNotes && ld.bookingNotes.toLowerCase().includes(rec.client.toLowerCase())) {
        return true;
      }
      return false;
    });

    return {
      ...rec,
      matchedLeadId: matchedLead?.id,
      matchedLeadName: matchedLead?.name,
      matchedLeadPhone: matchedLead?.phoneNumber,
    };
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 rounded-2xl shadow-2xl max-w-3xl w-full border border-zinc-800 max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div className="px-5 py-4 bg-zinc-950 text-white flex items-center justify-between shrink-0 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 text-white border border-zinc-700 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Laporan Harian Studio
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-200 border border-zinc-700">
                  {totalDPCount} DP Terverifikasi
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">
                📅 {formattedFullDate}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Modal Scrollable Body ── */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* 1. Omzet DP */}
            <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col justify-between shadow-2xs">
              <div>
                <div className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5 mb-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Omzet DP Hari Ini</span>
                </div>
                <div className="text-xl font-black text-white tracking-tight font-mono">
                  Rp {totalRevenue.toLocaleString("id-ID")}
                </div>
              </div>
              <div className="text-[10px] text-zinc-500 font-medium mt-1">
                {totalDPCount} transaksi transfer DP
              </div>
            </div>

            {/* 2. Leads New Customers */}
            <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col justify-between shadow-2xs">
              <div>
                <div className="text-[11px] font-semibold text-zinc-400 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Leads Baru</span>
                  </span>
                  <div className="flex items-center gap-1">
                    {isAutoInbound ? (
                      <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                        Auto CRM
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                        Manual
                      </span>
                    )}
                    {onOpenInputChat && (
                      <button
                        type="button"
                        onClick={() => onOpenInputChat(day)}
                        className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
                        title="Ubah data leads new customers"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-xl font-black text-white tracking-tight">
                  {effectiveInbound} Leads
                </div>
              </div>
              <div className="text-[10px] font-bold text-zinc-300 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded flex items-center justify-between mt-1">
                <span>Closing Rate:</span>
                <span className="font-mono text-white">{closingRate}%</span>
              </div>
            </div>

            {/* 3. Booking DP Sah */}
            <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col justify-between shadow-2xs">
              <div>
                <div className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5 mb-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Booking DP Sah</span>
                </div>
                <div className="text-xl font-black text-white tracking-tight">
                  {totalDPCount} Klien
                </div>
              </div>
              <div className="text-[10px] text-zinc-500 font-medium mt-1">
                {closingRate}% closing rate harian
              </div>
            </div>

            {/* 4. Shift Admin */}
            <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col justify-between shadow-2xs">
              <div>
                <div className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5 mb-1.5">
                  <Users className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Shift Admin</span>
                </div>
                <div className="text-xs font-medium text-zinc-300 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Admin 1:</span>
                    <span className="font-bold text-white font-mono">{admin1Count} DP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Admin 2:</span>
                    <span className="font-bold text-white font-mono">{admin2Count} DP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Paket Terlaris */}
            <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col justify-between shadow-2xs">
              <div>
                <div className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Paket Terlaris</span>
                </div>
                <div className="text-xs font-medium text-zinc-300 space-y-1">
                  {topPackages.slice(0, 2).map(([pkg, count]) => (
                    <div key={pkg} className="flex justify-between truncate">
                      <span className="truncate text-zinc-400">{pkg}:</span>
                      <span className="font-bold text-white ml-1 font-mono">{count}x</span>
                    </div>
                  ))}
                  {topPackages.length === 0 && <span className="text-zinc-600">-</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Table / List of Clients */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-zinc-400" />
                <span>Rincian Pembayaran DP Klien ({totalDPCount} Transaksi)</span>
              </h4>
              <span className="text-[11px] text-zinc-500 font-mono">
                Log Order Kasir Studio
              </span>
            </div>

            <div className="border border-zinc-800 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 font-semibold text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">Nama Klien</th>
                      <th className="py-2.5 px-3">Paket Foto</th>
                      <th className="py-2.5 px-3">Jadwal Foto</th>
                      <th className="py-2.5 px-3">Nominal DP</th>
                      <th className="py-2.5 px-3">Admin CS</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 bg-zinc-900">
                    {enrichedRecords.map((item, idx) => {
                      const adminNormalized = item.admin.toUpperCase().includes("AMEL")
                        ? "Admin 1 (Amel)"
                        : "Admin 2 (Indah)";

                      return (
                        <tr
                          key={idx}
                          className="hover:bg-zinc-800/60 transition-colors"
                        >
                          <td className="py-2.5 px-3 font-mono text-zinc-500 text-2xs">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-zinc-100">
                            <div>{item.client}</div>
                            {item.matchedLeadName && item.matchedLeadName !== item.client && (
                              <div className="text-[10px] text-zinc-400 font-normal flex items-center gap-0.5">
                                <span>WA: {item.matchedLeadName}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                              {item.paket}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-400 text-[11px] font-mono">
                            {item.tgl_foto ? item.tgl_foto.split(" ")[0] : "-"}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-white font-mono">
                            Rp {item.nominal.toLocaleString("id-ID")}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-zinc-300">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                              {adminNormalized}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {item.matchedLeadId ? (
                              <button
                                onClick={() => {
                                  onSelectLeadForChat(item.matchedLeadId!);
                                  onClose();
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-zinc-200 text-zinc-950 transition-all shadow-2xs cursor-pointer"
                                title="Buka ruang obrolan klien ini di CRM"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>Buka Chat</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-zinc-500 italic">
                                Kasir Studio
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ── Modal Footer ── */}
        <div className="px-5 py-3.5 bg-zinc-950 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="text-xs text-zinc-400 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>
              Total <strong>{totalDPCount} Transaksi</strong> terekapitulasi pada tanggal {day} September 2026.
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                onApplyDayFilter(day);
                onClose();
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>🔍 Saring Chat CRM Tanggal Ini</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
