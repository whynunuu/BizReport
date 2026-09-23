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
}: DailyReportModalProps) {
  if (!isOpen) return null;

  // Determine weekday for September [day], 2026
  const dateObj = new Date(2026, 8, day);
  const dayName = INDONESIAN_DAYS[dateObj.getDay()];
  const formattedFullDate = `${dayName}, ${day} September 2026`;

  // Aggregate metrics for this day
  const totalDPCount = records.length;
  const totalRevenue = records.reduce((sum, r) => sum + (r.nominal || 0), 0);

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
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Laporan Harian Studio
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {totalDPCount} DP Terverifikasi
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                📅 {formattedFullDate}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Modal Scrollable Body ── */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
              <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Omzet DP Hari Ini</span>
              </div>
              <div className="text-lg font-extrabold text-emerald-700">
                Rp {totalRevenue.toLocaleString("id-ID")}
              </div>
              <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                {totalDPCount} transaksi transfer DP
              </div>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl">
              <div className="text-[11px] font-semibold text-blue-800 flex items-center gap-1 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Booking DP Sah</span>
              </div>
              <div className="text-lg font-extrabold text-blue-700">
                {totalDPCount} Klien
              </div>
              <div className="text-[10px] text-blue-600 font-medium mt-0.5">
                Slot jadwal terkonfirmasi
              </div>
            </div>

            <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl">
              <div className="text-[11px] font-semibold text-purple-800 flex items-center gap-1 mb-1">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>Shift Admin Bertugas</span>
              </div>
              <div className="text-xs font-bold text-purple-900 mt-1 space-y-0.5">
                <div className="flex justify-between">
                  <span>Admin 1 (Amel):</span>
                  <span className="font-extrabold text-purple-700">{admin1Count} DP</span>
                </div>
                <div className="flex justify-between">
                  <span>Admin 2 (Indah):</span>
                  <span className="font-extrabold text-purple-700">{admin2Count} DP</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
              <div className="text-[11px] font-semibold text-amber-800 flex items-center gap-1 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Paket Terlaris</span>
              </div>
              <div className="text-xs font-bold text-amber-900 mt-1 space-y-0.5">
                {topPackages.slice(0, 2).map(([pkg, count]) => (
                  <div key={pkg} className="flex justify-between truncate">
                    <span className="truncate">{pkg}:</span>
                    <span className="font-extrabold text-amber-700 ml-1">{count}x</span>
                  </div>
                ))}
                {topPackages.length === 0 && <span className="text-slate-400">-</span>}
              </div>
            </div>
          </div>

          {/* Table / List of Clients */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Rincian Pembayaran DP Klien ({totalDPCount} Transaksi)</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                Pencatatan Log Order Studio
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[11px]">
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
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {enrichedRecords.map((item, idx) => {
                      const adminNormalized = item.admin.toUpperCase().includes("AMEL")
                        ? "Admin 1 (Amel)"
                        : "Admin 2 (Indah)";

                      return (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="py-2.5 px-3 font-mono text-slate-400 text-2xs">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            <div>{item.client}</div>
                            {item.matchedLeadName && item.matchedLeadName !== item.client && (
                              <div className="text-[10px] text-emerald-700 font-normal flex items-center gap-0.5">
                                <span>WA: {item.matchedLeadName}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {item.paket}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px] font-mono">
                            {item.tgl_foto ? item.tgl_foto.split(" ")[0] : "-"}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-emerald-700 font-mono">
                            Rp {item.nominal.toLocaleString("id-ID")}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-600">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                adminNormalized.includes("Admin 1")
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-purple-50 text-purple-700"
                              }`}
                            >
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
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-2xs cursor-pointer"
                                title="Buka ruang obrolan klien ini di CRM"
                              >
                                <MessageSquare className="w-3 h-3" />
                                <span>Buka Chat</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">
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
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
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
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>🔍 Saring Chat CRM Tanggal Ini</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
