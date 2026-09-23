"use client";

import React, { useState, useEffect, useRef } from "react";
import { UserCheck, ChevronDown, Clock, Sparkles, Check, Hash } from "lucide-react";

interface ActiveShiftInfo {
  adminName: string;
  hashtag: string;
  shiftTime: string;
  shiftName: string;
  isAuto: boolean;
  isOffHours: boolean;
  currentWibTime: string;
}

export default function AdminShiftDropdown() {
  const [shiftInfo, setShiftInfo] = useState<ActiveShiftInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchShift = async () => {
    try {
      const res = await fetch("/api/admin-shift");
      const data = await res.json();
      if (data.success) {
        setShiftInfo(data.activeShift);
      }
    } catch (err) {
      console.warn("Gagal memuat status shift:", err);
    }
  };

  useEffect(() => {
    fetchShift();
    const interval = setInterval(fetchShift, 30000); // Poll setiap 30 detik
    return () => clearInterval(interval);
  }, []);

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectShift = async (target: "AUTO" | "Admin 1" | "Admin 2") => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/admin-shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetAdmin: target }),
      });
      const data = await res.json();
      if (data.success && data.activeShift) {
        setShiftInfo(data.activeShift);
      }
    } catch (err) {
      console.error("Gagal mengubah shift:", err);
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  if (!shiftInfo) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-2xs text-slate-500 font-mono animate-pulse">
        <Clock className="w-3 h-3 text-slate-400" />
        <span>Memuat Shift...</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* TRIGGER BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all text-xs font-semibold text-slate-700 shadow-2xs cursor-pointer"
        title="Klik untuk mengganti admin yang sedang bertugas (Fleksibel Mahasiswa)"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            shiftInfo.isOffHours
              ? "bg-slate-400"
              : shiftInfo.adminName === "Admin 1"
              ? "bg-emerald-500"
              : "bg-indigo-500"
          }`}
        ></span>

        <span className="font-bold text-slate-900">
          {shiftInfo.adminName}
        </span>

        <span className="text-2xs text-slate-400 font-mono hidden sm:inline">
          ({shiftInfo.shiftTime})
        </span>

        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-mono font-normal">
          {shiftInfo.hashtag}
        </span>

        <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-2 space-y-1.5">
          <div className="px-2.5 py-1.5 border-b border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Pilih Admin Bertugas (Shift Fleksibel)
            </span>
            <p className="text-2xs text-slate-500 mt-0.5">
              Ganti siapa yang sedang jaga shift jika ada tukar jadwal kuliah / kelas dadakan.
            </p>
          </div>

          {/* Option: AUTO */}
          <button
            onClick={() => handleSelectShift("AUTO")}
            className={`w-full text-left p-2 rounded-xl transition-all flex items-start gap-2.5 text-xs ${
              shiftInfo.isAuto
                ? "bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/60"
                : "hover:bg-slate-50 text-slate-700"
            }`}
          >
            <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-3 h-3" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">Otomatis Sesuai Jam</span>
                {shiftInfo.isAuto && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </div>
              <span className="text-2xs text-slate-500 block">
                09:00-15:00 (Admin 1) | 15:00-21:00 (Admin 2)
              </span>
            </div>
          </button>

          {/* Option: Admin 1 */}
          <button
            onClick={() => handleSelectShift("Admin 1")}
            className={`w-full text-left p-2 rounded-xl transition-all flex items-start gap-2.5 text-xs ${
              !shiftInfo.isAuto && shiftInfo.adminName === "Admin 1"
                ? "bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/60"
                : "hover:bg-slate-50 text-slate-700"
            }`}
          >
            <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <UserCheck className="w-3 h-3" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">Admin 1 (Shift Pagi)</span>
                {!shiftInfo.isAuto && shiftInfo.adminName === "Admin 1" && (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                )}
              </div>
              <span className="text-2xs text-slate-500 block">
                Jam Kerja: 09:00 - 15:00 WIB • Tanda tangan: #Admin1
              </span>
            </div>
          </button>

          {/* Option: Admin 2 */}
          <button
            onClick={() => handleSelectShift("Admin 2")}
            className={`w-full text-left p-2 rounded-xl transition-all flex items-start gap-2.5 text-xs ${
              !shiftInfo.isAuto && shiftInfo.adminName === "Admin 2"
                ? "bg-indigo-50 text-indigo-900 font-bold border border-indigo-200/60"
                : "hover:bg-slate-50 text-slate-700"
            }`}
          >
            <div className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
              <UserCheck className="w-3 h-3" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">Admin 2 (Shift Sore)</span>
                {!shiftInfo.isAuto && shiftInfo.adminName === "Admin 2" && (
                  <Check className="w-3.5 h-3.5 text-indigo-600" />
                )}
              </div>
              <span className="text-2xs text-slate-500 block">
                Jam Kerja: 15:00 - 21:00 WIB • Tanda tangan: #Admin2
              </span>
            </div>
          </button>

          {/* Footer hashtag info */}
          <div className="pt-2 border-t border-slate-100 px-2 py-1 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-1.5 text-2xs text-slate-500">
              <Hash className="w-3 h-3 text-amber-500 shrink-0" />
              <span>
                Setiap draf balasan otomatis disisipkan <strong>{shiftInfo.hashtag}</strong> untuk lacak closing KPI.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
