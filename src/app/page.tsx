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
      <div className="bg-zinc-900 rounded-3xl p-6 md:p-10 text-white shadow-sm border border-zinc-800 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-300">
            <Camera className="w-4 h-4 text-zinc-300" />
            <span>Foxe Studio Photo Studio Management System</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight leading-tight text-white">
            Manajemen Booking Sesi Foto, Kasir Studio & Laporan Harian Terintegrasi
          </h1>
          <p className="text-sm md:text-base text-zinc-400 leading-relaxed">
            Sistem operasional photo studio yang fleksibel untuk Laptop/PC dan Smartphone (HP).
            Catat booking sesi wisuda, Photofox self photo box, group, dan couple, kelola add-on, serta rekonsiliasi kas laci studio.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/pos"
              className="bg-white text-zinc-950 hover:bg-zinc-200 font-bold px-5 py-2.5 rounded-xl text-xs md:text-sm shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Buka Terminal Booking (POS)</span>
            </Link>

            <Link
              href="/orders"
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 font-semibold px-5 py-2.5 rounded-xl text-xs md:text-sm flex items-center gap-2 transition-all"
            >
              <ReceiptText className="w-4 h-4 text-zinc-400" />
              <span>Jadwal & Sesi Foto Hari Ini</span>
            </Link>

            <Link
              href="/input"
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 font-semibold px-5 py-2.5 rounded-xl text-xs md:text-sm flex items-center gap-2 transition-all"
            >
              <ClipboardPenLine className="w-4 h-4 text-zinc-400" />
              <span>Input Closing Shift</span>
            </Link>

            <Link
              href="/dashboard"
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 font-semibold px-5 py-2.5 rounded-xl text-xs md:text-sm flex items-center gap-2 transition-all"
            >
              <LayoutDashboard className="w-4 h-4 text-zinc-400" />
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
          className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xs hover:border-zinc-600 hover:bg-zinc-850/80 transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <Camera className="w-6 h-6 text-zinc-200" />
            </div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Kasir / Resepsionis Studio
            </span>
            <h3 className="text-base font-bold text-white mb-1.5">
              Terminal Booking & Layanan
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Pilih paket resmi Foxe: Graduation Standard/Premium, Photofox, Large Group, Family, Couple, dan opsi kustomisasi add-on orang/background.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-zinc-800 flex items-center justify-between text-xs font-semibold text-zinc-300 group-hover:text-white">
            <span>Buka Kasir Booking</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 2 */}
        <Link
          href="/orders"
          className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xs hover:border-zinc-600 hover:bg-zinc-850/80 transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <ReceiptText className="w-6 h-6 text-zinc-200" />
            </div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Fotografer & Jadwal Studio
            </span>
            <h3 className="text-base font-bold text-white mb-1.5">
              Daftar Booking & Sesi Klien
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Pantau antrean sesi foto per slot 20 menit, nama klien, tipe paket foto, ruangan studio, status bayar (QRIS/Cash/Transfer), dan catatan kustom.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-zinc-800 flex items-center justify-between text-xs font-semibold text-zinc-300 group-hover:text-white">
            <span>Lihat Jadwal Sesi</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card 3 */}
        <Link
          href="/dashboard"
          className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xs hover:border-zinc-600 hover:bg-zinc-850/80 transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <LayoutDashboard className="w-6 h-6 text-zinc-200" />
            </div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Owner & Manajemen Studio
            </span>
            <h3 className="text-base font-bold text-white mb-1.5">
              Dashboard Analitik Studio
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Visualisasi performa omzet sesi studio, perbandingan paket terlaris, split pembayaran non-tunai vs tunai, dan audit kas fisik laci kasir.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-zinc-800 flex items-center justify-between text-xs font-semibold text-zinc-300 group-hover:text-white">
            <span>Buka Dashboard Studio</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* FEATURE HIGHLIGHT: STUDIO OPERATIONS */}
      <div className="bg-zinc-900 p-6 md:p-8 rounded-3xl border border-zinc-800 shadow-sm">
        <h3 className="font-bold text-base md:text-lg text-white mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-zinc-300" />
          Fitur Operasional Studio Foto yang Telah Aktif
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-zinc-200">
              <Smartphone className="w-4 h-4 text-zinc-400" /> Fleksibel di HP & Tablet
            </div>
            <p className="text-zinc-400 text-[11px]">
              Kasir, resepsionis, dan fotografer bisa memantau jadwal dan memasukkan invoice booking langsung dari smartphone.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-zinc-200">
              <Camera className="w-4 h-4 text-zinc-400" /> Katalog Pricelist Resmi
            </div>
            <p className="text-zinc-400 text-[11px]">
              Tersedia paket Graduation, Photofox, Group, Family, Couple, Pas Foto, hingga add-on orang dan background.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-zinc-200">
              <CheckCircle2 className="w-4 h-4 text-zinc-400" /> Rekonsiliasi Kas Studio
            </div>
            <p className="text-zinc-400 text-[11px]">
              Hitung otomatis modal kas kecil laci + pembayaran tunai klien - biaya operasional studio harian.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-zinc-200">
              <ReceiptText className="w-4 h-4 text-zinc-400" /> Cetak Invoice & Struk
            </div>
            <p className="text-zinc-400 text-[11px]">
              Invoice booking rapi siap print dengan QRIS payment, breakdown paket, add-on, dan nama fotografer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
