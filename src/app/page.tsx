import Link from "next/link";
import {
  ClipboardPenLine,
  LayoutDashboard,
  ReceiptText,
  Camera,
  CheckCircle2,
  TrendingUp,
  Store,
  ShieldCheck,
  ArrowRight,
  Smartphone,
  Laptop,
  Users,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* HERO BANNER */}
      <div className="bg-gradient-to-br from-amber-600 via-amber-700 to-orange-900 rounded-3xl p-6 md:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-semibold">
            <Camera className="w-4 h-4" />
            <span>Foxe Studio Photo Studio Management System</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight leading-tight">
            Manajemen Booking Sesi Foto, Kasir Studio & Laporan Harian Terintegrasi
          </h1>
          <p className="text-sm md:text-base text-amber-100/90 leading-relaxed">
            Sistem operasional photo studio yang fleksibel untuk Laptop/PC dan Smartphone (HP).
            Catat booking sesi wisuda, Photofox self photo box, group, dan couple, kelola add-on, serta rekonsiliasi kas laci studio.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/pos"
              className="bg-white text-amber-900 hover:bg-amber-50 font-bold px-5 py-2.5 rounded-xl text-xs md:text-sm shadow-md flex items-center gap-2 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Buka Terminal Booking (POS)</span>
            </Link>

            <Link
              href="/orders"
              className="bg-amber-800/80 hover:bg-amber-800 text-white border border-amber-500/40 font-semibold px-5 py-2.5 rounded-xl text-xs md:text-sm flex items-center gap-2 transition-all"
            >
              <ReceiptText className="w-4 h-4" />
              <span>Jadwal & Sesi Foto Hari Ini</span>
            </Link>

            <Link
              href="/input"
              className="bg-amber-900/90 hover:bg-amber-900 text-white border border-amber-500/40 font-semibold px-5 py-2.5 rounded-xl text-xs md:text-sm flex items-center gap-2 transition-all"
            >
              <ClipboardPenLine className="w-4 h-4" />
              <span>Input Closing Shift</span>
            </Link>

            <Link
              href="/dashboard"
              className="bg-slate-900/80 hover:bg-slate-900 text-white font-semibold px-5 py-2.5 rounded-xl text-xs md:text-sm flex items-center gap-2 transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard Owner Studio</span>
            </Link>
          </div>
        </div>
      </div>

      {/* QUICK WORKFLOW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1 */}
        <Link
          href="/pos"
          className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-400 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
              Kasir / Resepsionis Studio
            </span>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">
              Terminal Booking & Layanan
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pilih paket resmi Foxe: Graduation Standard/Premium, Photofox, Large Group, Family, Couple, dan opsi kustomisasi add-on orang/background.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-amber-700">
            <span>Buka Kasir Booking</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 2 */}
        <Link
          href="/orders"
          className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-400 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <ReceiptText className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block mb-1">
              Fotografer & Jadwal Studio
            </span>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">
              Daftar Booking & Sesi Klien
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pantau antrean sesi foto per slot 20 menit, nama klien, tipe paket foto, ruangan studio, status bayar (QRIS/Cash/Transfer), dan catatan kustom.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-700">
            <span>Lihat Jadwal Sesi</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 3 */}
        <Link
          href="/dashboard"
          className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
              Owner & Manajemen Studio
            </span>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">
              Dashboard Analitik Studio
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Visualisasi performa omzet sesi studio, perbandingan paket terlaris, split pembayaran non-tunai vs tunai, dan audit kas fisik laci kasir.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700">
            <span>Buka Dashboard Studio</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* FEATURE HIGHLIGHT: STUDIO OPERATIONS */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <h3 className="font-bold text-base md:text-lg text-slate-900 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          Fitur Operasional Studio Foto yang Telah Aktif
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Smartphone className="w-4 h-4 text-amber-600" /> Fleksibel di HP & Tablet
            </div>
            <p className="text-slate-500 text-[11px]">
              Kasir, resepsionis, dan fotografer bisa memantau jadwal dan memasukkan invoice booking langsung dari smartphone.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Camera className="w-4 h-4 text-blue-600" /> Katalog Pricelist Resmi
            </div>
            <p className="text-slate-500 text-[11px]">
              Tersedia paket Graduation, Photofox, Group, Family, Couple, Pas Foto, hingga add-on orang dan background.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Rekonsiliasi Kas Studio
            </div>
            <p className="text-slate-500 text-[11px]">
              Hitung otomatis modal kas kecil laci + pembayaran tunai klien - biaya operasional studio harian.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <ReceiptText className="w-4 h-4 text-purple-600" /> Cetak Invoice & Struk
            </div>
            <p className="text-slate-500 text-[11px]">
              Invoice booking rapi siap print dengan QRIS payment, breakdown paket, add-on, dan nama fotografer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
