"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  DollarSign,
  Wallet,
  Receipt,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle,
  HelpCircle,
  Clock,
  User,
  Store,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Calculator,
  Coffee,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { ExpenseInput } from "@/types/report";
import { generateTimeSlots, formatTimeSlotRange } from "@/lib/timeUtils";

export default function InputReportPage() {
  const router = useRouter();

  // Form Step State (1: Shift Info, 2: Omzet & Payment, 3: Kas Laci & Petty Cash, 4: Catatan & Submit)
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form Fields
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [branchName, setBranchName] = useState("Foxe Studio - Studio 1");
  const [shift, setShift] = useState<"Pagi" | "Siang" | "Malam" | "Full Day">(
    "Malam"
  );
  const [staffName, setStaffName] = useState("Admin Foxe");

  // Jam Shift dengan Interval 20 Menit
  const shiftTimeSlots = useMemo(() => generateTimeSlots(6, 23, 20), []);
  const [shiftStartTime, setShiftStartTime] = useState("10:00");
  const [shiftEndTime, setShiftEndTime] = useState("20:00");

  // Revenue & Payment Methods
  const [grossSales, setGrossSales] = useState<number>(3850000);
  const [discountTotal, setDiscountTotal] = useState<number>(150000);
  const [taxAndService, setTaxAndService] = useState<number>(0);
  const [totalTransactions, setTotalTransactions] = useState<number>(12);
  const [customerCount, setCustomerCount] = useState<number>(28);

  // Payments
  const [cashSales, setCashSales] = useState<number>(950000);
  const [qrisSales, setQrisSales] = useState<number>(2200000);
  const [debitCardSales, setDebitCardSales] = useState<number>(550000);
  const [creditCardSales, setCreditCardSales] = useState<number>(0);
  const [onlineDelivery, setOnlineDelivery] = useState<number>(0);
  const [transferSales, setTransferSales] = useState<number>(0);

  // Cash Drawer Balancing
  const [openingCashFloat, setOpeningCashFloat] = useState<number>(300000);
  const [actualCashInDrawer, setActualCashInDrawer] = useState<number>(1190000);
  const [differenceReason, setDifferenceReason] = useState("");

  // Petty Cash Expenses for Photo Studio
  const [expenses, setExpenses] = useState<ExpenseInput[]>([
    {
      description: "Baterai AA remote clicker & flash (4 pcs)",
      category: "Operasional",
      amount: 35000,
    },
    {
      description: "Lakban kain & pembersih lensa studio",
      category: "Kebersihan",
      amount: 25000,
    },
  ]);
  const [newExpenseDesc, setNewExpenseDesc] = useState("");
  const [newExpenseCat, setNewExpenseCat] = useState<
    "Operasional" | "Bahan Baku" | "Transport" | "Kebersihan" | "Lainnya"
  >("Operasional");
  const [newExpenseAmount, setNewExpenseAmount] = useState<string>("");

  // Notes
  const [operationalNotes, setOperationalNotes] = useState(
    "Sesi foto wisuda dan Photofox berjalan lancar. Lampu lighting kalibrasi normal."
  );

  // CALCULATIONS
  const netSales = useMemo(() => {
    return Math.max(0, grossSales - discountTotal);
  }, [grossSales, discountTotal]);

  const totalPayments = useMemo(() => {
    return (
      cashSales +
      qrisSales +
      debitCardSales +
      creditCardSales +
      onlineDelivery +
      transferSales
    );
  }, [
    cashSales,
    qrisSales,
    debitCardSales,
    creditCardSales,
    onlineDelivery,
    transferSales,
  ]);

  const paymentBalanceDifference = useMemo(() => {
    return grossSales - totalPayments;
  }, [grossSales, totalPayments]);

  const totalExpensesAmount = useMemo(() => {
    return expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [expenses]);

  // Expected Cash = Modal Awal + Uang Tunai Penjualan - Pengeluaran Kas
  const expectedCashInDrawer = useMemo(() => {
    return openingCashFloat + cashSales - totalExpensesAmount;
  }, [openingCashFloat, cashSales, totalExpensesAmount]);

  // Cash Difference = Uang Fisik Aktual - Expected
  const cashDifference = useMemo(() => {
    return actualCashInDrawer - expectedCashInDrawer;
  }, [actualCashInDrawer, expectedCashInDrawer]);

  const addExpenseItem = () => {
    if (!newExpenseDesc || !newExpenseAmount || Number(newExpenseAmount) <= 0)
      return;
    setExpenses([
      ...expenses,
      {
        description: newExpenseDesc,
        category: newExpenseCat,
        amount: Number(newExpenseAmount),
      },
    ]);
    setNewExpenseDesc("");
    setNewExpenseAmount("");
  };

  const removeExpenseItem = (index: number) => {
    setExpenses(expenses.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        reportDate,
        branchName,
        businessType: "Studio Foto",
        shift,
        staffName,
        grossSales,
        discountTotal,
        taxAndService,
        totalTransactions,
        customerCount,
        cashSales,
        qrisSales,
        debitCardSales,
        creditCardSales,
        onlineDelivery,
        transferSales,
        openingCashFloat,
        actualCashInDrawer,
        differenceReason: cashDifference !== 0 ? differenceReason : undefined,
        operationalNotes,
        expenseItems: expenses,
      };

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan laporan");
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan sistem");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-white rounded-2xl p-5 md:p-6 shadow-xs border border-slate-200/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                Shift Closing Studio
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Langkah {currentStep} dari 4
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Laporan Closing Shift Studio Foto & Kas Laci
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Input revenue sesi foto, metode bayar klien, dan hitung selisih uang kas laci sebelum tutup shift studio.
            </p>
          </div>

          {/* Quick Step Indicators */}
          <div className="flex items-center gap-1.5 self-start md:self-auto">
            {[1, 2, 3, 4].map((stepNum) => (
              <button
                key={stepNum}
                type="button"
                onClick={() => setCurrentStep(stepNum)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center font-semibold text-xs transition-all ${
                  currentStep === stepNum
                    ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-200"
                    : currentStep > stepNum
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                }`}
              >
                {currentStep > stepNum ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  stepNum
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ERROR / SUCCESS ALERTS */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {submitSuccess && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
          <CheckCircle className="w-6 h-6 shrink-0 text-emerald-600" />
          <div>
            <h4 className="font-bold text-base">Laporan Berhasil Disimpan!</h4>
            <p className="text-xs text-emerald-700">
              Data laporan harian dan rekonsiliasi kas telah terekam. Mengalihkan ke Dashboard...
            </p>
          </div>
        </div>
      )}

      {/* FORM BODY */}
      <form onSubmit={handleSubmit}>
        {/* STEP 1: INFO SHIFT & PETUGAS */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl p-5 md:p-6 shadow-xs border border-slate-200/80 space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Store className="w-5 h-5 text-amber-600" />
                1. Info Shift & Studio
              </h3>
              <p className="text-xs text-slate-500">
                Tentukan waktu shift studio dan nama staf/fotografer yang bertanggung jawab atas kasir.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tanggal Laporan
                </label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-slate-50/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Studio / Ruangan
                </label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="Foxe Studio - Studio 1"
                  className="w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-slate-50/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pilih Shift
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Pagi", "Malam", "Full Day"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setShift(s)}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                        shift === s
                          ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Kasir / Staf Bertugas
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    placeholder="Contoh: Kevin (Admin / Fotografer)"
                    className="w-full text-sm rounded-xl border border-slate-200 pl-9 pr-3.5 py-2.5 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-slate-50/50"
                    required
                  />
                </div>
              </div>

              {/* JAM MULAI & SELESAI SHIFT (INTERVAL 20 MENIT) */}
              <div className="md:col-span-2 grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> Jam Buka Shift (20 Mnt)
                  </label>
                  <select
                    value={shiftStartTime}
                    onChange={(e) => setShiftStartTime(e.target.value)}
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                  >
                    {shiftTimeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot} ({formatTimeSlotRange(slot, 20)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> Jam Tutup Shift (20 Mnt)
                  </label>
                  <select
                    value={shiftEndTime}
                    onChange={(e) => setShiftEndTime(e.target.value)}
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800"
                  >
                    {shiftTimeSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot} ({formatTimeSlotRange(slot, 20)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all"
              >
                <span>Lanjut ke Penjualan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PENJUALAN & PEMBAGIAN METODE PEMBAYARAN */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl p-5 md:p-6 shadow-xs border border-slate-200/80 space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-600" />
                2. Ringkasan Omzet & Metode Pembayaran
              </h3>
              <p className="text-xs text-slate-500">
                Masukkan total omzet dan pisahkan berdasarkan nominal tiap channel pembayaran.
              </p>
            </div>

            {/* Total Omzet & Diskon */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Omzet Kotor (Gross Sales)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={grossSales || ""}
                    onChange={(e) => setGrossSales(Number(e.target.value))}
                    className="w-full text-sm font-bold text-slate-900 rounded-xl border border-slate-200 pl-9 pr-3 py-2 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Diskon / Voucher Promo
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={discountTotal || ""}
                    onChange={(e) => setDiscountTotal(Number(e.target.value))}
                    className="w-full text-sm text-slate-900 rounded-xl border border-slate-200 pl-9 pr-3 py-2 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="md:col-span-2 pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">
                  Omzet Bersih (Net Sales):
                </span>
                <span className="font-extrabold text-sm text-amber-900 font-mono">
                  Rp {netSales.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Breakdown Metode Pembayaran */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Rincian Pembayaran
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <label className="block text-xs font-semibold text-emerald-800 mb-1 flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-emerald-600" /> Uang Tunai (Cash)
                  </label>
                  <input
                    type="number"
                    value={cashSales || ""}
                    onChange={(e) => setCashSales(Number(e.target.value))}
                    className="w-full text-sm font-semibold rounded-lg border border-slate-200 px-3 py-1.5 bg-white"
                    placeholder="0"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Uang fisik kasir yang harus disetor
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <label className="block text-xs font-semibold text-blue-800 mb-1">
                    QRIS (BCA / Gopay / ShopeePay)
                  </label>
                  <input
                    type="number"
                    value={qrisSales || ""}
                    onChange={(e) => setQrisSales(Number(e.target.value))}
                    className="w-full text-sm font-semibold rounded-lg border border-slate-200 px-3 py-1.5 bg-white"
                    placeholder="0"
                  />
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <label className="block text-xs font-semibold text-purple-800 mb-1">
                    Kartu Debit (EDC)
                  </label>
                  <input
                    type="number"
                    value={debitCardSales || ""}
                    onChange={(e) => setDebitCardSales(Number(e.target.value))}
                    className="w-full text-sm font-semibold rounded-lg border border-slate-200 px-3 py-1.5 bg-white"
                    placeholder="0"
                  />
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <label className="block text-xs font-semibold text-amber-800 mb-1">
                    Transfer Bank (BCA / Mandiri / BSI)
                  </label>
                  <input
                    type="number"
                    value={onlineDelivery || ""}
                    onChange={(e) => setOnlineDelivery(Number(e.target.value))}
                    className="w-full text-sm font-semibold rounded-lg border border-slate-200 px-3 py-1.5 bg-white"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Payment validation indicator */}
              <div
                className={`p-3 rounded-xl text-xs flex items-center justify-between font-medium ${
                  paymentBalanceDifference === 0
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}
              >
                <span>Total Rincian Pembayaran:</span>
                <span className="font-mono font-bold">
                  Rp {totalPayments.toLocaleString("id-ID")}{" "}
                  {paymentBalanceDifference !== 0 && (
                    <span className="text-red-600 font-normal">
                      (Selisih Rp {paymentBalanceDifference.toLocaleString("id-ID")})
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="pt-3 flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-xl flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all"
              >
                <span>Lanjut ke Kas Laci</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REKONSILIASI KAS LACI & PETTY CASH (CORE CLOSING) */}
        {currentStep === 3 && (
          <div className="bg-white rounded-2xl p-5 md:p-6 shadow-xs border border-slate-200/80 space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-600" />
                3. Rekonsiliasi Kas Laci Studio (Cash Balancing)
              </h3>
              <p className="text-xs text-slate-500">
                Hitung uang kas masuk sesi foto, pengeluaran kasir, dan pastikan uang fisik di laci studio sesuai.
              </p>
            </div>

            {/* Modal Awal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Modal Kas Awal di Laci (Cash Float)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={openingCashFloat || ""}
                    onChange={(e) => setOpeningCashFloat(Number(e.target.value))}
                    className="w-full text-sm font-semibold rounded-xl border border-slate-200 pl-9 pr-3 py-2 bg-slate-50/50"
                    placeholder="300000"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Uang kembalian yang disiapkan sebelum buka studio
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Penjualan Tunai Shift Ini
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    disabled
                    value={cashSales.toLocaleString("id-ID")}
                    className="w-full text-sm font-bold text-emerald-800 rounded-xl border border-emerald-200 pl-9 pr-3 py-2 bg-emerald-50/50"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Terkoneksi otomatis dari nominal Tunai Langkah 2
                </span>
              </div>
            </div>

            {/* Pengeluaran Kas Kecil (Petty Cash) */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Pengeluaran Studio / Kas Kecil (Petty Cash)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Belanja darurat studio (baterai flash, lakban kain, konsumsi klien, pembersih)
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                  Total: Rp {totalExpensesAmount.toLocaleString("id-ID")}
                </span>
              </div>

              {/* List Pengeluaran */}
              <div className="space-y-2">
                {expenses.map((exp, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-600 font-medium">
                        {exp.category}
                      </span>
                      <span className="font-medium text-slate-800">
                        {exp.description}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-red-600">
                        -Rp {exp.amount.toLocaleString("id-ID")}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeExpenseItem(idx)}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Form Tambah Pengeluaran */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Nama keperluan (cth: Baterai flash studio)"
                  value={newExpenseDesc}
                  onChange={(e) => setNewExpenseDesc(e.target.value)}
                  className="sm:col-span-6 text-xs rounded-xl border border-slate-200 px-3 py-2 bg-white"
                />
                <select
                  value={newExpenseCat}
                  onChange={(e) => setNewExpenseCat(e.target.value as any)}
                  className="sm:col-span-3 text-xs rounded-xl border border-slate-200 px-2.5 py-2 bg-white"
                >
                  <option value="Operasional">Operasional</option>
                  <option value="Bahan Baku">Perlengkapan</option>
                  <option value="Transport">Transport</option>
                  <option value="Kebersihan">Kebersihan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
                <div className="sm:col-span-3 flex gap-1">
                  <input
                    type="number"
                    placeholder="Nominal"
                    value={newExpenseAmount}
                    onChange={(e) => setNewExpenseAmount(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 px-2.5 py-2 bg-white"
                  />
                  <button
                    type="button"
                    onClick={addExpenseItem}
                    className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl px-2.5 flex items-center justify-center shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* LIVE CALCULATION & AUDIT BOX */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-3 shadow-md">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-amber-400" />
                  Target Kas Seharusnya di Laci:
                </span>
                <span className="font-mono text-sm font-bold text-amber-400">
                  Rp {expectedCashInDrawer.toLocaleString("id-ID")}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Rumus: Modal Awal (Rp {openingCashFloat.toLocaleString("id-ID")}) +
                Penjualan Tunai (Rp {cashSales.toLocaleString("id-ID")}) - Pengeluaran (Rp{" "}
                {totalExpensesAmount.toLocaleString("id-ID")})
              </p>

              <div className="pt-2 border-t border-slate-700/80">
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  Hitung Uang Fisik Aktual di Laci (Ketik Hasil Hitungan Anda)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={actualCashInDrawer || ""}
                    onChange={(e) =>
                      setActualCashInDrawer(Number(e.target.value))
                    }
                    className="w-full text-base font-bold text-slate-900 rounded-xl border border-slate-200 pl-9 pr-3 py-2 bg-white focus:ring-2 focus:ring-amber-500"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              {/* Difference Status Badge */}
              <div
                className={`p-3 rounded-xl text-xs flex items-center justify-between font-bold ${
                  cashDifference === 0
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : cashDifference > 0
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-red-500/20 text-red-300 border border-red-500/30"
                }`}
              >
                <span>
                  {cashDifference === 0
                    ? "✓ Kas Cocok / Balanced"
                    : cashDifference > 0
                    ? "⚠️ Kas Berlebih (Over)"
                    : "❌ Kas Kurang (Short)"}
                </span>
                <span className="font-mono text-sm">
                  {cashDifference >= 0 ? "+" : ""}Rp{" "}
                  {cashDifference.toLocaleString("id-ID")}
                </span>
              </div>

              {/* Alasan Selisih jika != 0 */}
              {cashDifference !== 0 && (
                <div className="pt-1">
                  <label className="block text-xs font-semibold text-red-300 mb-1">
                    Alasan Selisih Kas (Wajib Diisi Kasir)
                  </label>
                  <input
                    type="text"
                    value={differenceReason}
                    onChange={(e) => setDifferenceReason(e.target.value)}
                    placeholder="Contoh: Kembalian kurang pecahan Rp 2.000 / salah input nominal"
                    className="w-full text-xs text-slate-900 rounded-xl px-3 py-2 bg-white"
                    required
                  />
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="pt-2 flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-xl flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all"
              >
                <span>Lanjut ke Review</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: OPERASIONAL & SUBMIT */}
        {currentStep === 4 && (
          <div className="bg-white rounded-2xl p-5 md:p-6 shadow-xs border border-slate-200/80 space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-amber-600" />
                4. Catatan Operasional & Konfirmasi Laporan
              </h3>
              <p className="text-xs text-slate-500">
                Cek ringkasan akhir dan masukkan catatan shift sebelum mengirim laporan closing.
              </p>
            </div>

            {/* Metric counters */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Sesi / Booking
                </label>
                <input
                  type="number"
                  value={totalTransactions || ""}
                  onChange={(e) =>
                    setTotalTransactions(Number(e.target.value))
                  }
                  className="w-full text-sm font-bold rounded-lg border border-slate-200 px-3 py-1.5 bg-white"
                  placeholder="0"
                />
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Klien / Orang (Pax)
                </label>
                <input
                  type="number"
                  value={customerCount || ""}
                  onChange={(e) => setCustomerCount(Number(e.target.value))}
                  className="w-full text-sm font-bold rounded-lg border border-slate-200 px-3 py-1.5 bg-white"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Operational Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Catatan Operasional Studio (Opsional)
              </label>
              <textarea
                rows={3}
                value={operationalNotes}
                onChange={(e) => setOperationalNotes(e.target.value)}
                placeholder="Tulis kendala lighting, kamera, background, request khusus wisuda/photofox, atau situasi studio..."
                className="w-full text-xs rounded-xl border border-slate-200 p-3 bg-slate-50/50 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            {/* Summary Review Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                Ringkasan Laporan Closing Studio Shift {shift}
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Staf / Fotografer:</span>
                <span className="font-semibold text-slate-900">{staffName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Omzet Kotor:</span>
                <span className="font-semibold font-mono">
                  Rp {grossSales.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Omzet Bersih:</span>
                <span className="font-bold font-mono text-amber-900">
                  Rp {netSales.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Pengeluaran Kas Kecil:</span>
                <span className="font-semibold font-mono text-red-600">
                  Rp {totalExpensesAmount.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                <span>Status Kas Laci:</span>
                <span
                  className={`font-bold font-mono ${
                    cashDifference === 0
                      ? "text-emerald-700"
                      : "text-red-600"
                  }`}
                >
                  {cashDifference === 0
                    ? "Cocok (Rp 0)"
                    : `Selisih Rp ${cashDifference.toLocaleString("id-ID")}`}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-xl flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-6 py-3 rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Menyimpan Laporan...</span>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Kirim Laporan Closing Shift</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
