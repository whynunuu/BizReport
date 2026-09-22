import Link from "next/link";
import {
  ClipboardPenLine,
  LayoutDashboard,
  ReceiptText,
  FileSpreadsheet,
  Coffee,
  CheckCircle2,
  TrendingUp,
  Store,
  ShieldCheck,
  ArrowRight,
  Smartphone,
  Laptop,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* HERO BANNER */}
      <div className="bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 rounded-3xl p-6 md:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-semibold">
            <Coffee className="w-4 h-4" />
            <span>BizReport FnB & Sales Operating System</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight leading-tight">
            Pelaporan Shift Kasir & Rekonsiliasi Kas Laci Lebih Cepat dan Akurat
          </h1>
          <p className="text-sm md:text-base text-amber-100/90 leading-relaxed">
            Sistem terintegrasi yang fleksibel untuk Laptop/PC dan Smartphone (HP).
            Catat order per bill, pantau uang fisik di laci kasir, dan pantau performa omzet harian.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/input"
              className="bg-white text-amber-900 hover:bg-amber-50 font-bold px-5 py-2.5 rounded-xl text-xs md:text-sm shadow-md flex items-center gap-2 transition-all"
            >
              <ClipboardPenLine className="w-4 h-4" />
              <span>Input Closing Shift (Kasir)</span>
            </Link>

            <Link
              href="/orders"
              className="bg-amber-800/80 hover:bg-amber-800 text-white border border-amber-500/40 font-semibold px-5 py-2.5 rounded-xl text-xs md:text-sm flex items-center gap-2 transition-all"
            >
              <ReceiptText className="w-4 h-4" />
              <span>Daftar Order / Bill Hari Ini</span>
            </Link>

            <Link
              href="/dashboard"
              className="bg-slate-900/80 hover:bg-slate-900 text-white font-semibold px-5 py-2.5 rounded-xl text-xs md:text-sm flex items-center gap-2 transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Buka Dashboard Owner</span>
            </Link>
          </div>
        </div>
      </div>

      {/* QUICK WORKFLOW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1 */}
        <Link
          href="/input"
          className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-amber-400 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <ClipboardPenLine className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
              Kasir / Staf Shift
            </span>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">
              Input Closing Shift Harian
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Form 4-langkah yang dioptimalkan untuk layar HP. Hitung uang fisik aktual laci kasir, otomatis deteksi selisih (cocok, lebih, atau tekor).
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-amber-700">
            <span>Buka Form Closing</span>
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
              Audit & Transaksi
            </span>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">
              Daftar Bill & Menu Terpesan
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pantau seluruh bill per meja atau takeaway. Lihat rincian item menu, catatan pesanan khusus pelanggan, serta metode bayar.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-700">
            <span>Lihat Semua Bill</span>
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
              Owner & Manajer
            </span>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">
              Dashboard Analitik Bisnis
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Visualisasi KPI omzet kotor/bersih, margin, tren harian/mingguan, pengeluaran kas kecil, dan persentase akurasi kasir.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700">
            <span>Buka Dashboard</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* FEATURE HIGHLIGHT: DEVICE FLEXIBILITY */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <h3 className="font-bold text-base md:text-lg text-slate-900 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          Fleksibilitas Akses & Perangkat yang Telah Aktif
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Smartphone className="w-4 h-4 text-amber-600" /> Mobile Smartphone
            </div>
            <p className="text-slate-500 text-[11px]">
              Bottom navigation bar, form step-by-step ramah jempol, responsif di Android dan iPhone.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Laptop className="w-4 h-4 text-blue-600" /> Laptop & PC Desktop
            </div>
            <p className="text-slate-500 text-[11px]">
              Sidebar navigasi penuh, tampilan kartu multi-kolom lebar, dan tabel audit data.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Auto-Balancing Kas
            </div>
            <p className="text-slate-500 text-[11px]">
              Rumus otomatis: Modal Awal + Penjualan Tunai - Pengeluaran Kas = Target Kas Laci.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <ReceiptText className="w-4 h-4 text-purple-600" /> Detail Order per Menu
            </div>
            <p className="text-slate-500 text-[11px]">
              Tiap bill menyimpan menu, qty, harga satuan, subtotal, meja, dan catatan khusus.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
