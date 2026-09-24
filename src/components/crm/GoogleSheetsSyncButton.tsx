"use client";

import React, { useState } from "react";
import { Table, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, X } from "lucide-react";

export default function GoogleSheetsSyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const sheetUrl = "https://docs.google.com/spreadsheets/d/11a5G5Dk18s_VgJ9pkFMhC6XJ6KwTq67CNcrDJlmqLwI/edit";

  async function handleSync() {
    try {
      setIsSyncing(true);
      setStatusMsg("Sedang mengekspor seluruh data leads ke Google Sheets...");
      setIsError(false);

      const res = await fetch("/api/crm/sync-google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (data.status === "success") {
        setStatusMsg(`✅ Berhasil! ${data.syncedCount || data.totalLeads} leads tersinkron ke Google Sheet.`);
        setIsError(false);
      } else {
        setIsError(true);
        setStatusMsg(data.message || "Gagal menyinkronkan ke Google Sheets.");
        setShowModal(true);
      }
    } catch {
      setIsError(true);
      setStatusMsg("Koneksi gagal atau webhook Google Sheets belum aktif.");
      setShowModal(true);
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all border border-emerald-200/80 shadow-2xs cursor-pointer disabled:opacity-50"
          title="Sinkronkan seluruh data leads CRM ke Google Spreadsheet secara instan"
        >
          {isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
          ) : (
            <Table className="w-3.5 h-3.5 text-emerald-600" />
          )}
          <span>{isSyncing ? "Menyinkronkan..." : "Sinkron ke Google Sheet"}</span>
        </button>

        <a
          href={sheetUrl}
          target="_blank"
          rel="noreferrer"
          className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors border border-transparent hover:border-emerald-200/60"
          title="Buka Spreadsheet Data Lead 2026 - Foxe Studio"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {statusMsg && !showModal && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 ${
            isError
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-emerald-900 text-white border-emerald-800 shadow-emerald-900/20"
          }`}
        >
          {isError ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{statusMsg}</span>
          <button
            onClick={() => setStatusMsg(null)}
            className="ml-2 p-1 text-slate-400 hover:text-white rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Panduan Modal jika Webhook belum dideploy */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">Aktivasi Google Apps Script Webhook</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-600 leading-relaxed">
              <div className="bg-amber-50 border border-amber-200/80 p-3 rounded-xl text-amber-900">
                <p className="font-semibold mb-1">Spreadsheet Belum Menerima Trigger:</p>
                <p className="text-2xs text-amber-800">
                  Spreadsheet <strong>Data Lead 2026 - Foxe Studio</strong> membutuhkan Webhook Apps Script aktif agar server CRM diizinkan menulis data secara otomatis.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-slate-800">Langkah Pemasangan 1 Menit:</p>
                <ol className="list-decimal pl-4 space-y-1.5 text-2xs text-slate-700">
                  <li>
                    Buka Spreadsheet:{" "}
                    <a
                      href={sheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 font-semibold underline inline-flex items-center gap-0.5"
                    >
                      <span>Data Lead 2026 - Foxe Studio</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </li>
                  <li>
                    Klik menu <strong>Extensions (Ekstensi)</strong> &rarr; <strong>Apps Script</strong>.
                  </li>
                  <li>
                    Tempelkan kode script yang ada di file <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">scripts/GoogleAppsScript_DataLeadSync.js</code>.
                  </li>
                  <li>
                    Klik tombol <strong>Deploy (Terapkan)</strong> di kanan atas &rarr; <strong>New deployment (Penerapan baru)</strong>.
                  </li>
                  <li>
                    Pilih type: <strong>Web app</strong>. Setting: <em>Execute as: Me</em>, dan <strong>Who has access: Anyone (Siapa saja)</strong>.
                  </li>
                  <li>Salin Web app URL dan masukkan ke file <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">.env</code>.</li>
                </ol>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
                >
                  Tutup
                </button>
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Google Sheet</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
