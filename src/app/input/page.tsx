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
      <div className="bg-zinc-900 rounded-2xl p-5 md:p-6 shadow-sm border border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                Shift Closing Studio
              </span>
              <span className="text-xs text-zinc-500 font-mono">
                Langkah {currentStep} dari 4
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Laporan Closing Shift Studio Foto & Kas Laci
            </h2>
            <p className="text-xs md:text-sm text-zinc-400 mt-0.5">
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
                className={`w-8 h-8 rounded-xl flex items-center justify-center font-semibold text-xs transition-all cursor-pointer ${
                  currentStep === stepNum
                    ? "bg-white text-zinc-950 font-bold shadow-xs ring-2 ring-zinc-400"
                    : currentStep > stepNum
                    ? "bg-zinc-800 text-white border border-zinc-700"
                    : "bg-zinc-950 text-zinc-500 border border-zinc-800 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                {currentStep > stepNum ? (
                  <CheckCircle className="w-4 h-4 text-white" />
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
        <div className="p-4 rounded-xl bg-zinc-900 border border-rose-800 text-rose-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {submitSuccess && (
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-700 text-white text-sm flex items-center gap-3">
          <CheckCircle className="w-6 h-6 shrink-0 text-white" />
          <div>
            <h4 className="font-bold text-base">Laporan Berhasil Disimpan!</h4>
            <p className="text-xs text-zinc-400">
              Data laporan harian dan rekonsiliasi kas telah terekam. Mengalihkan ke Dashboard...
            </p>
          </div>
        </div>
      )}

      {/* FORM BODY */}
      <form onSubmit={handleSubmit}>
        {/* STEP 1: INFO SHIFT & PETUGAS */}
        {currentStep === 1 && (
          <div className="bg-zinc-900 rounded-2xl p-5 md:p-6 shadow-sm border border-zinc-800 space-y-5 text-white">
            <div className="border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-zinc-300" />
                1. Info Shift & Studio
              </h3>
              <p className="text-xs text-zinc-400">
                Tentukan waktu shift studio dan nama staf/fotografer yang bertanggung jawab atas kasir.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Tanggal Laporan
                </label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="w-full text-sm rounded-xl border border-zinc-800 px-3.5 py-2.5 focus:border-zinc-600 bg-zinc-950 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Studio / Ruangan
                </label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="Foxe Studio - Studio 1"
                  className="w-full text-sm rounded-xl border border-zinc-800 px-3.5 py-2.5 focus:border-zinc-600 bg-zinc-950 text-white placeholder-zinc-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Pilih Shift
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Pagi", "Malam", "Full Day"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setShift(s)}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                        shift === s
                          ? "bg-white text-zinc-950 border-white font-bold shadow-xs"
                          : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Nama Kasir / Staf Bertugas
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    placeholder="Contoh: Kevin (Admin / Fotografer)"
                    className="w-full text-sm rounded-xl border border-zinc-800 pl-9 pr-3.5 py-2.5 focus:border-zinc-600 bg-zinc-950 text-white placeholder-zinc-500"
                    required
                  />
                </div>
              </div>

              {/* JAM MULAI & SELESAI SHIFT (INTERVAL 20 MENIT) */}
              <div className="md:col-span-2 grid grid-cols-2 gap-3 p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" /> Jam Buka Shift (20 Mnt)
                  </label>
                  <select
                    value={shiftStartTime}
                    onChange={(e) => setShiftStartTime(e.target.value)}
                    className="w-full text-xs font-mono font-bold bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white"
                  >
                    {shiftTimeSlots.map((slot) => (
                      <option key={slot} value={slot} className="bg-zinc-900 text-white">
                        {slot} ({formatTimeSlotRange(slot, 20)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-300 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" /> Jam Tutup Shift (20 Mnt)
                  </label>
                  <select
                    value={shiftEndTime}
                    onChange={(e) => setShiftEndTime(e.target.value)}
                    className="w-full text-xs font-mono font-bold bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white"
                  >
                    {shiftTimeSlots.map((slot) => (
                      <option key={slot} value={slot} className="bg-zinc-900 text-white">
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
                className="bg-white hover:bg-zinc-200 text-zinc-950 text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <span>Lanjut ke Penjualan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PENJUALAN & PEMBAGIAN METODE PEMBAYARAN */}
        {currentStep === 2 && (
          <div className="bg-zinc-900 rounded-2xl p-5 md:p-6 shadow-sm border border-zinc-800 space-y-5 text-white">
            <div className="border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-zinc-300" />
                2. Ringkasan Omzet & Metode Pembayaran
              </h3>
              <p className="text-xs text-zinc-400">
                Masukkan total omzet dan pisahkan berdasarkan nominal tiap channel pembayaran.
              </p>
            </div>

            {/* Total Omzet & Diskon */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Omzet Kotor (Gross Sales)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={grossSales || ""}
                    onChange={(e) => setGrossSales(Number(e.target.value))}
                    className="w-full text-sm font-bold text-white rounded-xl border border-zinc-800 pl-9 pr-3 py-2 bg-zinc-900 focus:border-zinc-600"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Total Diskon / Voucher Promo
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={discountTotal || ""}
                    onChange={(e) => setDiscountTotal(Number(e.target.value))}
                    className="w-full text-sm text-white rounded-xl border border-zinc-800 pl-9 pr-3 py-2 bg-zinc-900 focus:border-zinc-600"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="md:col-span-2 pt-2 border-t border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium">
                  Omzet Bersih (Net Sales):
                </span>
                <span className="font-extrabold text-sm text-white font-mono">
                  Rp {netSales.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Breakdown Metode Pembayaran */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Rincian Pembayaran
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950">
                  <label className="block text-xs font-semibold text-zinc-200 mb-1 flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5 text-zinc-400" /> Uang Tunai (Cash)
                  </label>
                  <input
                    type="number"
                    value={cashSales || ""}
                    onChange={(e) => setCashSales(Number(e.target.value))}
                    className="w-full text-sm font-semibold rounded-lg border border-zinc-800 px-3 py-1.5 bg-zinc-900 text-white"
                    placeholder="0"
                  />
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">
                    Uang fisik kasir yang harus disetor
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950">
                  <label className="block text-xs font-semibold text-zinc-200 mb-1">
                    QRIS (BCA / Gopay / ShopeePay)
                  </label>
                  <input
                    type="number"
                    value={qrisSales || ""}
                    onChange={(e) => setQrisSales(Number(e.target.value))}
                    className="w-full text-sm font-semibold rounded-lg border border-zinc-800 px-3 py-1.5 bg-zinc-900 text-white"
                    placeholder="0"
                  />
                </div>

                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950">
                  <label className="block text-xs font-semibold text-zinc-200 mb-1">
                    Kartu Debit (EDC)
                  </label>
                  <input
                    type="number"
                    value={debitCardSales || ""}
                    onChange={(e) => setDebitCardSales(Number(e.target.value))}
                    className="w-full text-sm font-semibold rounded-lg border border-zinc-800 px-3 py-1.5 bg-zinc-900 text-white"
                    placeholder="0"
                  />
                </div>

                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950">
                  <label className="block text-xs font-semibold text-zinc-200 mb-1">
                    Transfer Bank (BCA / Mandiri / BSI)
                  </label>
                  <input
                    type="number"
                    value={onlineDelivery || ""}
                    onChange={(e) => setOnlineDelivery(Number(e.target.value))}
                    className="w-full text-sm font-semibold rounded-lg border border-zinc-800 px-3 py-1.5 bg-zinc-900 text-white"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Payment validation indicator */}
              <div
                className={`p-3 rounded-xl text-xs flex items-center justify-between font-medium border ${
                  paymentBalanceDifference === 0
                    ? "bg-zinc-950 text-zinc-200 border-zinc-800"
                    : "bg-zinc-950 text-rose-400 border-rose-800/60"
                }`}
              >
                <span>Total Rincian Pembayaran:</span>
                <span className="font-mono font-bold">
                  Rp {totalPayments.toLocaleString("id-ID")}{" "}
                  {paymentBalanceDifference !== 0 && (
                    <span className="text-rose-400 font-normal">
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
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-sm font-medium px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="bg-white hover:bg-zinc-200 text-zinc-950 text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <span>Lanjut ke Kas Laci</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REKONSILIASI KAS LACI & PETTY CASH (CORE CLOSING) */}
        {currentStep === 3 && (
          <div className="bg-zinc-900 rounded-2xl p-5 md:p-6 shadow-sm border border-zinc-800 space-y-6 text-white">
            <div className="border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-zinc-300" />
                3. Rekonsiliasi Kas Laci Studio (Cash Balancing)
              </h3>
              <p className="text-xs text-zinc-400">
                Hitung uang kas masuk sesi foto, pengeluaran kasir, dan pastikan uang fisik di laci studio sesuai.
              </p>
            </div>

            {/* Modal Awal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Modal Kas Awal di Laci (Cash Float)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={openingCashFloat || ""}
                    onChange={(e) => setOpeningCashFloat(Number(e.target.value))}
                    className="w-full text-sm font-semibold rounded-xl border border-zinc-800 pl-9 pr-3 py-2 bg-zinc-950 text-white placeholder-zinc-500"
                    placeholder="300000"
                  />
                </div>
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Uang kembalian yang disiapkan sebelum buka studio
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Penjualan Tunai Shift Ini
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">
                    Rp
                  </span>
                  <input
                    type="text"
                    disabled
                    value={cashSales.toLocaleString("id-ID")}
                    className="w-full text-sm font-bold text-emerald-400 rounded-xl border border-zinc-800 pl-9 pr-3 py-2 bg-zinc-950"
                  />
                </div>
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Terkoneksi otomatis dari nominal Tunai Langkah 2
                </span>
              </div>
            </div>

            {/* Pengeluaran Kas Kecil (Petty Cash) */}
            <div className="border-t border-zinc-800 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Pengeluaran Studio / Kas Kecil (Petty Cash)
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Belanja darurat studio (baterai flash, lakban kain, konsumsi klien, pembersih)
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-rose-400 bg-zinc-950 border border-zinc-800 px-2 py-1 rounded-lg">
                  Total: Rp {totalExpensesAmount.toLocaleString("id-ID")}
                </span>
              </div>

              {/* List Pengeluaran */}
              <div className="space-y-2">
                {expenses.map((exp, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-300 font-medium">
                        {exp.category}
                      </span>
                      <span className="font-medium text-zinc-200">
                        {exp.description}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-rose-400">
                        -Rp {exp.amount.toLocaleString("id-ID")}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeExpenseItem(idx)}
                        className="text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
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
                  className="sm:col-span-6 text-xs rounded-xl border border-zinc-800 px-3 py-2 bg-zinc-950 text-white placeholder-zinc-500"
                />
                <select
                  value={newExpenseCat}
                  onChange={(e) => setNewExpenseCat(e.target.value as any)}
                  className="sm:col-span-3 text-xs rounded-xl border border-zinc-800 px-2.5 py-2 bg-zinc-950 text-white"
                >
                  <option value="Operasional" className="bg-zinc-900">Operasional</option>
                  <option value="Bahan Baku" className="bg-zinc-900">Perlengkapan</option>
                  <option value="Transport" className="bg-zinc-900">Transport</option>
                  <option value="Kebersihan" className="bg-zinc-900">Kebersihan</option>
                  <option value="Lainnya" className="bg-zinc-900">Lainnya</option>
                </select>
                <div className="sm:col-span-3 flex gap-1">
                  <input
                    type="number"
                    placeholder="Nominal"
                    value={newExpenseAmount}
                    onChange={(e) => setNewExpenseAmount(e.target.value)}
                    className="w-full text-xs rounded-xl border border-zinc-800 px-2.5 py-2 bg-zinc-950 text-white placeholder-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={addExpenseItem}
                    className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-xl px-2.5 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* LIVE CALCULATION & AUDIT BOX */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-white space-y-3 shadow-md">
              <div className="flex items-center justify-between text-xs text-zinc-300">
                <span className="font-semibold flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-zinc-400" />
                  Target Kas Seharusnya di Laci:
                </span>
                <span className="font-mono text-sm font-bold text-white">
                  Rp {expectedCashInDrawer.toLocaleString("id-ID")}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 leading-tight">
                Rumus: Modal Awal (Rp {openingCashFloat.toLocaleString("id-ID")}) +
                Penjualan Tunai (Rp {cashSales.toLocaleString("id-ID")}) - Pengeluaran (Rp{" "}
                {totalExpensesAmount.toLocaleString("id-ID")})
              </p>

              <div className="pt-2 border-t border-zinc-800">
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Hitung Uang Fisik Aktual di Laci (Ketik Hasil Hitungan Anda)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-500">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={actualCashInDrawer || ""}
                    onChange={(e) =>
                      setActualCashInDrawer(Number(e.target.value))
                    }
                    className="w-full text-base font-bold text-white rounded-xl border border-zinc-700 pl-9 pr-3 py-2 bg-zinc-900 focus:border-zinc-500"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              {/* Difference Status Badge */}
              <div
                className={`p-3 rounded-xl text-xs flex items-center justify-between font-bold border ${
                  cashDifference === 0
                    ? "bg-zinc-900 text-emerald-400 border-zinc-700"
                    : "bg-zinc-900 text-rose-400 border-zinc-700"
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
                  <label className="block text-xs font-semibold text-rose-400 mb-1">
                    Alasan Selisih Kas (Wajib Diisi Kasir)
                  </label>
                  <input
                    type="text"
                    value={differenceReason}
                    onChange={(e) => setDifferenceReason(e.target.value)}
                    placeholder="Contoh: Kembalian kurang pecahan Rp 2.000 / salah input nominal"
                    className="w-full text-xs text-white rounded-xl px-3 py-2 bg-zinc-900 border border-zinc-700"
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
                className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-sm font-medium px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="bg-white hover:bg-zinc-200 text-zinc-950 text-sm font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <span>Lanjut ke Review</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: OPERASIONAL & SUBMIT */}
        {currentStep === 4 && (
          <div className="bg-zinc-900 rounded-2xl p-5 md:p-6 shadow-sm border border-zinc-800 space-y-5 text-white">
            <div className="border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-zinc-300" />
                4. Catatan Operasional & Konfirmasi Laporan
              </h3>
              <p className="text-xs text-zinc-400">
                Cek ringkasan akhir dan masukkan catatan shift sebelum mengirim laporan closing.
              </p>
            </div>

            {/* Metric counters */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950">
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Total Sesi / Booking
                </label>
                <input
                  type="number"
                  value={totalTransactions || ""}
                  onChange={(e) =>
                    setTotalTransactions(Number(e.target.value))
                  }
                  className="w-full text-sm font-bold rounded-lg border border-zinc-800 px-3 py-1.5 bg-zinc-900 text-white"
                  placeholder="0"
                />
              </div>

              <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950">
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Total Klien / Orang (Pax)
                </label>
                <input
                  type="number"
                  value={customerCount || ""}
                  onChange={(e) => setCustomerCount(Number(e.target.value))}
                  className="w-full text-sm font-bold rounded-lg border border-zinc-800 px-3 py-1.5 bg-zinc-900 text-white"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Operational Notes */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Catatan Operasional Studio (Opsional)
              </label>
              <textarea
                rows={3}
                value={operationalNotes}
                onChange={(e) => setOperationalNotes(e.target.value)}
                placeholder="Tulis kendala lighting, kamera, background, request khusus wisuda/photofox, atau situasi studio..."
                className="w-full text-xs rounded-xl border border-zinc-800 p-3 bg-zinc-950 text-white placeholder-zinc-500 focus:border-zinc-600"
              />
            </div>

            {/* Summary Review Card */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs text-zinc-300">
              <div className="font-bold text-white border-b border-zinc-800 pb-1.5">
                Ringkasan Laporan Closing Studio Shift {shift}
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Staf / Fotografer:</span>
                <span className="font-semibold text-white">{staffName}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Omzet Kotor:</span>
                <span className="font-semibold font-mono text-white">
                  Rp {grossSales.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Omzet Bersih:</span>
                <span className="font-bold font-mono text-white">
                  Rp {netSales.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Pengeluaran Kas Kecil:</span>
                <span className="font-semibold font-mono text-rose-400">
                  Rp {totalExpensesAmount.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400 pt-1 border-t border-zinc-800">
                <span>Status Kas Laci:</span>
                <span
                  className={`font-bold font-mono ${
                    cashDifference === 0
                      ? "text-emerald-400"
                      : "text-rose-400"
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
                className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-sm font-medium px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-white hover:bg-zinc-200 text-zinc-950 text-sm font-bold px-6 py-3 rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
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
