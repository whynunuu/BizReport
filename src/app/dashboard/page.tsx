"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  Receipt,
  Users,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Store,
  ArrowUpRight,
  ArrowDownRight,
  ClipboardPenLine,
  ReceiptText,
  Camera,
  Clock,
  PieChart,
  BarChart3,
  FileSpreadsheet,
  ChevronRight,
  Bell,
  Award,
  Send,
  MessageSquare,
  Flame,
} from "lucide-react";

interface KPIStats {
  totalRevenue: number;
  netRevenue: number;
  totalExpenses: number;
  totalTransactions: number;
  totalCustomers: number;
  balancedCashShifts: number;
  totalShifts: number;
  averageOrderValue: number;
}

interface PaymentSplit {
  name: string;
  value: number;
  color: string;
}

interface DailyTrend {
  date: string;
  gross: number;
  net: number;
  expenses: number;
}

interface ReminderItem {
  leadId: string;
  name: string;
  phoneNumber: string;
  status: string;
  revenue: number;
  bookingNotes?: string | null;
  summary: string;
  recommendedReply: string;
  assignedAdmin: string;
  updatedAt: string;
}

interface CSPerformanceItem {
  adminName: string;
  handledLeads: number;
  convertedLeads: number;
  totalRevenue: number;
  conversionRate: number;
}

interface ConversionKPI {
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  totalConvertedRevenue: number;
  reminders: ReminderItem[];
  csPerformance: CSPerformanceItem[];
}

interface ReportItem {
  id: string;
  reportDate: string;
  branchName: string;
  shift: string;
  staffName: string;
  grossSales: number;
  netSales: number;
  cashSales: number;
  totalExpenses: number;
  expectedCash: number;
  actualCashInDrawer: number;
  cashDifference: number;
  differenceReason?: string | null;
  totalTransactions: number;
  customerCount: number;
  status: string;
  operationalNotes?: string | null;
  expenseItems: any[];
  orders?: any[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<{
    kpi: KPIStats;
    paymentSplit: PaymentSplit[];
    dailyTrend: DailyTrend[];
    recentReports: ReportItem[];
    conversionKpi?: ConversionKPI;
  } | null>(null);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  const [selectedReportDetail, setSelectedReportDetail] = useState<ReportItem | null>(null);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [resStats, resReports] = await Promise.all([
        fetch("/api/reports/stats"),
        fetch("/api/reports"),
      ]);

      const dataStats = await resStats.json();
      const dataReports = await resReports.json();

      if (dataStats.success) {
        setStats(dataStats.data);
      }
      if (dataReports.success) {
        setReports(dataReports.data);
      }
    } catch (err) {
      console.error("Gagal memuat data dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const kpi = stats?.kpi;
  const paymentSplit = stats?.paymentSplit || [];
  const dailyTrend = stats?.dailyTrend || [];

  const totalPaymentSum = paymentSplit.reduce((acc, p) => acc + p.value, 0);

  return (
    <div className="space-y-6">
      {/* HEADER DASHBOARD */}
      <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Owner Studio Analytics
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Live Studio Monitoring
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
            Dashboard Analitik Foxe Studio & Audit Kasir
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Pantau pertumbuhan omzet sesi foto, margin paket studio, pengeluaran kas kecil, dan akurasi rekonsiliasi kasir.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/pos"
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Terminal Booking</span>
          </Link>

          <Link
            href="/input"
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all"
          >
            <ClipboardPenLine className="w-4 h-4" />
            <span>Input Closing Shift</span>
          </Link>
        </div>
      </div>

      {/* REMINDER BOX CS (HUMAN-IN-THE-LOOP) */}
      {stats?.conversionKpi?.reminders && stats.conversionKpi.reminders.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-2 border-amber-400/80 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm md:text-base flex items-center gap-2 flex-wrap">
                  <span>Reminder CS: {stats.conversionKpi.reminders.length} Konfirmasi Booking Siap Dikirim</span>
                  <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-amber-200 text-amber-900 uppercase">
                    Action Required
                  </span>
                </h3>
                <p className="text-xs text-slate-600">
                  AI telah memverifikasi bukti transfer & menandai status konversi. <strong>Human CS wajib kirim balasan konfirmasi resmi ke customer.</strong>
                </p>
              </div>
            </div>
            <Link
              href="/crm"
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition-all self-start sm:self-auto"
            >
              <span>Lihat di CRM</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats.conversionKpi.reminders.map((rem) => {
              const cleanPhone = rem.phoneNumber.replace(/[^0-9]/g, "");
              const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                rem.recommendedReply || "Halo Kak! Pembayaran sudah kami terima dengan baik. Jadwal booking sesi foto kakak resmi terkonfirmasi!"
              )}`;

              return (
                <div
                  key={rem.leadId}
                  className="bg-white p-4 rounded-2xl border border-amber-200/70 shadow-2xs space-y-2.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-slate-900 text-sm">{rem.name}</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                        {rem.revenue > 0 ? `Rp ${rem.revenue.toLocaleString("id-ID")}` : "TERKONFIRMASI"}
                      </span>
                    </div>
                    <div className="text-2xs text-slate-500 font-mono mb-1.5 flex items-center gap-2 flex-wrap">
                      <span>{rem.phoneNumber}</span>
                      <span>• CS: {rem.assignedAdmin}</span>
                      {rem.bookingNotes && (
                        <span className="text-emerald-700 font-semibold">• {rem.bookingNotes}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {rem.summary}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-2xs text-amber-700 font-semibold flex items-center gap-1">
                      <span>💡 Draf siap:</span>
                      <span className="text-slate-400 font-normal">Review & kirim</span>
                    </span>
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all"
                    >
                      <Send className="w-3 h-3" />
                      <span>Kirim WA (Human)</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Card 1: Total Omzet Kotor */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Revenue Sesi</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-mono font-extrabold text-lg md:text-2xl text-slate-900 block">
              Rp {(kpi?.totalRevenue || 0).toLocaleString("id-ID")}
            </span>
            <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="w-3 h-3" /> +14.2% vs bulan lalu
            </span>
          </div>
        </div>

        {/* Card 2: Omzet Bersih (Net Sales) */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Revenue Bersih (Net)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-mono font-extrabold text-lg md:text-2xl text-emerald-800 block">
              Rp {(kpi?.netRevenue || 0).toLocaleString("id-ID")}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              Setelah potongan diskon & promo
            </span>
          </div>
        </div>

        {/* Card 3: Total Pengeluaran Kas Kecil Studio */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Biaya Operasional Studio</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-mono font-extrabold text-lg md:text-2xl text-rose-700 block">
              Rp {(kpi?.totalExpenses || 0).toLocaleString("id-ID")}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              Petty cash baterai, lakban, studio prop
            </span>
          </div>
        </div>

        {/* Card 4: Akurasi Kasir (Cash Balance) */}
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Akurasi Kas Laci Studio</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-mono font-extrabold text-lg md:text-2xl text-blue-900 block">
              {kpi?.totalShifts
                ? Math.round((kpi.balancedCashShifts / kpi.totalShifts) * 100)
                : 100}
              %
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              {kpi?.balancedCashShifts || 0} dari {kpi?.totalShifts || 0} shift kas cocok
            </span>
          </div>
        </div>
      </div>

      {/* CHARTS & BREAKDOWNS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tren Revenue Sesi Harian */}
        <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-600" />
                Tren Revenue Sesi Harian vs Biaya Studio
              </h3>
              <p className="text-xs text-slate-400">
                Visualisasi omzet sesi foto kotor, bersih, dan kas kecil studio per hari
              </p>
            </div>
            <span className="text-xs font-semibold bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600">
              7 Hari Terakhir
            </span>
          </div>

          {/* Bar Visualization Bars */}
          <div className="space-y-4 pt-2">
            {dailyTrend.map((day, idx) => {
              const maxGross = Math.max(...dailyTrend.map((d) => d.gross), 5000000);
              const percentage = Math.round((day.gross / maxGross) * 100);

              return (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-slate-700 font-bold">{day.date}</span>
                    <div className="flex gap-4 font-mono text-[11px]">
                      <span className="text-slate-900 font-bold">
                        Revenue: Rp {day.gross.toLocaleString("id-ID")}
                      </span>
                      <span className="text-rose-600">
                        Biaya: Rp {day.expenses.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${percentage}%` }}
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all"
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pembagian Metode Pembayaran */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-600" />
              Metode Pembayaran Klien
            </h3>
            <p className="text-xs text-slate-400">
              Distribusi channel pembayaran booking sesi foto
            </p>
          </div>

          {paymentSplit.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Belum ada data pembayaran
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {paymentSplit.map((pay, i) => {
                const percentage =
                  totalPaymentSum > 0
                    ? Math.round((pay.value / totalPaymentSum) * 100)
                    : 0;

                return (
                  <div key={i} className="space-y-1 text-xs">
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-700 font-semibold">{pay.name}</span>
                      <span className="font-mono text-slate-900 font-bold">
                        Rp {pay.value.toLocaleString("id-ID")} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: pay.color || "#f59e0b",
                        }}
                        className="h-full rounded-full transition-all"
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* KPI KONVERSI LEADS & PERFORMA TIM CS (COUNTABLE BULANAN) */}
      <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                <span>Monthly KPI & Conversion Tracker</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">Countable Metrics</span>
            </div>
            <h3 className="font-extrabold text-slate-900 text-base md:text-lg tracking-tight">
              KPI Konversi Leads & Performa Closing Tim CS
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Data terhitung untuk evaluasi performa CS, bonus closing, dan audit tingkat konversi WhatsApp bulanan.
            </p>
          </div>

          <Link
            href="/crm"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all border border-indigo-200/60 shadow-2xs self-start sm:self-auto"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Detail CRM Leads</span>
          </Link>
        </div>

        {/* 4 Countable Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60">
            <span className="text-xs text-slate-500 font-semibold block mb-1">Total Leads Masuk</span>
            <span className="font-mono font-extrabold text-xl md:text-2xl text-slate-900 block">
              {stats?.conversionKpi?.totalLeads || 0}
            </span>
            <span className="text-2xs text-slate-400 mt-1 block">Chat prospek masuk ke WA</span>
          </div>

          <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200/60">
            <span className="text-xs text-emerald-800 font-semibold block mb-1">Leads Terkonversi (Closing)</span>
            <span className="font-mono font-extrabold text-xl md:text-2xl text-emerald-800 block">
              {stats?.conversionKpi?.convertedLeads || 0} Leads
            </span>
            <span className="text-2xs text-emerald-600 font-medium mt-1 block">Bukti transfer sah terverifikasi</span>
          </div>

          <div className="bg-indigo-50/80 p-4 rounded-2xl border border-indigo-200/60">
            <span className="text-xs text-indigo-800 font-semibold block mb-1">Closing Rate (CR %)</span>
            <span className="font-mono font-extrabold text-xl md:text-2xl text-indigo-800 block">
              {stats?.conversionKpi?.conversionRate || 0}%
            </span>
            <span className="text-2xs text-indigo-600 font-medium mt-1 block">Rasio konversi dari total chat</span>
          </div>

          <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200/60">
            <span className="text-xs text-amber-800 font-semibold block mb-1">Total Omzet Closing WA</span>
            <span className="font-mono font-extrabold text-xl md:text-2xl text-amber-900 block">
              Rp {(stats?.conversionKpi?.totalConvertedRevenue || 0).toLocaleString("id-ID")}
            </span>
            <span className="text-2xs text-amber-700 font-medium mt-1 block">Akumulasi transfer DP & pelunasan</span>
          </div>
        </div>

        {/* Tabel Breakdown Performa CS untuk KPI Akhir Bulan */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-600" />
              <span>Rincian Performa & Kontribusi CS (Untuk KPI Akhir Bulan)</span>
            </h4>
            <span className="text-2xs text-slate-400">Diurutkan berdasarkan closing terbanyak</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Nama CS / Admin</th>
                  <th className="py-3 px-4 text-center">Leads Ditangani</th>
                  <th className="py-3 px-4 text-center">Terkonversi (Closing)</th>
                  <th className="py-3 px-4 text-center">Closing Rate (%)</th>
                  <th className="py-3 px-4 text-right">Omzet Dihasilkan</th>
                  <th className="py-3 px-4 text-center">Evaluasi KPI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!stats?.conversionKpi?.csPerformance || stats.conversionKpi.csPerformance.length === 0) ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      Belum ada data interaksi admin tercatat.
                    </td>
                  </tr>
                ) : (
                  stats.conversionKpi.csPerformance.map((cs, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-all">
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-mono text-2xs font-bold">
                          {idx + 1}
                        </span>
                        <span>{cs.adminName}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">{cs.handledLeads} chat</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-700 font-mono">
                        {cs.convertedLeads} leads
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-indigo-700 font-mono">
                        {cs.conversionRate}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-slate-900">
                        Rp {cs.totalRevenue.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold ${
                            cs.conversionRate >= 50
                              ? "bg-emerald-100 text-emerald-800"
                              : cs.conversionRate >= 30
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {cs.conversionRate >= 50 ? "⭐ Top Closer" : cs.conversionRate >= 30 ? "👍 Bagus" : "On Track"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AUDIT LOG LAPORAN SHIFT */}
      <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base md:text-lg flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Audit Laporan Harian Studio & Kas Laci
            </h3>
            <p className="text-xs text-slate-400">
              Audit catatan shift studio, uang kas yang disetor, dan status selisih kas fisik laci.
            </p>
          </div>

          <Link
            href="/orders"
            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Lihat Seluruh Booking Sesi</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Tabel Rekap Shift */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Tanggal & Shift</th>
                <th className="py-3 px-3">Staf / Fotografer</th>
                <th className="py-3 px-3">Revenue Sesi</th>
                <th className="py-3 px-3">Kas Masuk</th>
                <th className="py-3 px-3">Biaya Studio</th>
                <th className="py-3 px-3">Kas Fisik Laci</th>
                <th className="py-3 px-3">Status Selisih</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((r) => {
                const dateFormatted = new Date(r.reportDate).toLocaleDateString(
                  "id-ID",
                  { day: "numeric", month: "short", year: "numeric" }
                );

                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block">
                        {dateFormatted}
                      </span>
                      <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                        Shift {r.shift}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-medium text-slate-700">
                      {r.staffName}
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      Rp {r.grossSales.toLocaleString("id-ID")}
                    </td>

                    <td className="py-3 px-3 font-mono text-emerald-800 font-semibold">
                      Rp {r.cashSales.toLocaleString("id-ID")}
                    </td>

                    <td className="py-3 px-3 font-mono text-rose-600">
                      -Rp {r.totalExpenses.toLocaleString("id-ID")}
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      Rp {r.actualCashInDrawer.toLocaleString("id-ID")}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3">
                      {r.cashDifference === 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Cocok (Rp 0)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                          <AlertCircle className="w-3 h-3" /> Selisih Rp {r.cashDifference.toLocaleString("id-ID")}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedReportDetail(r)}
                        className="text-xs font-semibold text-slate-700 hover:text-amber-700 bg-slate-100 hover:bg-amber-50 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL LAPORAN SHIFT */}
      {selectedReportDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 md:p-6 shadow-2xl border border-slate-200 my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  Audit Shift Closing Studio
                </span>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Laporan {selectedReportDetail.branchName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReportDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[10px]">Tanggal & Shift</span>
                  <span className="font-bold text-slate-800">
                    {new Date(selectedReportDetail.reportDate).toLocaleDateString("id-ID")} (
                    {selectedReportDetail.shift})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Staf / Fotografer</span>
                  <span className="font-bold text-slate-800">
                    {selectedReportDetail.staffName}
                  </span>
                </div>
              </div>

              {/* Rincian Pengeluaran Petty Cash Studio */}
              <div className="border-t border-slate-100 pt-2">
                <span className="font-bold text-slate-700 block mb-1.5">
                  Rincian Pengeluaran Studio ({selectedReportDetail.expenseItems?.length || 0} item):
                </span>
                <div className="space-y-1">
                  {selectedReportDetail.expenseItems?.map((exp, i) => (
                    <div
                      key={i}
                      className="flex justify-between p-2 rounded-lg bg-slate-50 text-[11px]"
                    >
                      <span className="text-slate-700">
                        {exp.description} ({exp.category})
                      </span>
                      <span className="font-mono font-bold text-rose-600">
                        -Rp {exp.amount.toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Catatan Operasional */}
              {selectedReportDetail.operationalNotes && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-amber-900">
                  <span className="font-bold block text-[11px] mb-0.5">
                    Catatan Operasional Studio:
                  </span>
                  <p className="text-[11px] leading-tight">
                    {selectedReportDetail.operationalNotes}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedReportDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
