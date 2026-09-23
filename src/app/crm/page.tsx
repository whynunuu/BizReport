import React from "react";
import { prisma } from "@/lib/prisma";
import {
  MessageSquare,
  Flame,
  UserCheck,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  Phone,
  Clock,
  Send,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CRMPage() {
  const leads = await prisma.lead.findMany({
    include: {
      interactions: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const totalLeads = leads.length;
  const highPriorityCount = leads.filter((l) =>
    l.interactions.some((i) => i.isHighPriority)
  ).length;
  const followUpCount = leads.filter((l) =>
    l.interactions.some((i) => i.needsFollowUp)
  ).length;
  const bookingCount = leads.filter(
    (l) => l.status === "QUALIFIED" || l.hasBooking
  ).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>AI Lead Triage & CRM Engine Active</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            WhatsApp AI CRM & Lead Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pantau pesan masuk WhatsApp, analisis niat & urgensi pelanggan otomatis oleh Gemini AI.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/crm"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Data</span>
          </Link>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{totalLeads}</div>
            <div className="text-xs text-slate-500 font-medium">Total Leads Terdata</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{highPriorityCount}</div>
            <div className="text-xs text-slate-500 font-medium">Prioritas Tinggi / Urgent</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">{followUpCount}</div>
            <div className="text-xs text-slate-500 font-medium">Antrian Follow-Up</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">{bookingCount}</div>
            <div className="text-xs text-slate-500 font-medium">Potensi Booking Sesi</div>
          </div>
        </div>
      </div>

      {/* TERMINAL WHATSAPP LIVE RUNNER NOTICE */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <Sparkles className="w-4 h-4" />
            <span>Koneksi WhatsApp Langsung (Tanpa Fonnte / Tanpa Meta)</span>
          </div>
          <p className="text-xs text-slate-300">
            Kamu bisa menghubungkan nomor WhatsApp kamu langsung dari terminal dengan perintah{" "}
            <code className="bg-slate-700/80 px-2 py-0.5 rounded text-emerald-300 font-mono">
              npm run whatsapp
            </code>
            . Cukup scan QR code sekali dari HP, dan bot AI langsung standby!
          </p>
        </div>
      </div>

      {/* LEADS LIST & INTERACTIONS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-base">Daftar Interaksi Lead Masuk</h2>
          <span className="text-xs text-slate-500">Tersinkron otomatis ke Neon DB</span>
        </div>

        {leads.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">Belum ada lead masuk.</p>
            <p className="text-xs text-slate-400 mt-1">
              Jalankan simulasi atau kirim pesan WhatsApp untuk melihat data muncul di sini.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {leads.map((lead) => {
              const latestInteraction = lead.interactions[0];
              const isUrgent = latestInteraction?.isHighPriority;

              return (
                <div
                  key={lead.id}
                  className={`p-5 transition-all hover:bg-slate-50/80 ${
                    isUrgent ? "bg-red-50/30" : ""
                  }`}
                >
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">
                          {lead.name || "Customer Tanpa Nama"}
                        </span>
                        <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {lead.phoneNumber}
                        </span>

                        {isUrgent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                            <Flame className="w-3 h-3" />
                            URGENT ({latestInteraction?.urgencyScore}/5)
                          </span>
                        )}

                        {latestInteraction?.intentCategory && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                            {latestInteraction.intentCategory}
                          </span>
                        )}

                        {latestInteraction?.needsFollowUp && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                            Butuh Follow-Up
                          </span>
                        )}
                      </div>

                      {latestInteraction && (
                        <p className="text-xs text-slate-600 line-clamp-2">
                          <span className="font-semibold text-slate-700">Pesan:</span> &ldquo;
                          {latestInteraction.messageText}&rdquo;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`https://wa.me/${lead.phoneNumber.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-xs"
                      >
                        <Send className="w-3 h-3" />
                        <span>Buka Chat WA</span>
                      </a>
                    </div>
                  </div>

                  {/* AI SUMMARY & RECOMMENDED REPLY BOX */}
                  {latestInteraction && (
                    <div className="mt-3 bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                        <div className="text-xs text-slate-600">
                          <span className="font-semibold text-slate-800">Analisis AI:</span>{" "}
                          {latestInteraction.summary}
                        </div>
                      </div>

                      {latestInteraction.recommendedReply && (
                        <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700">
                          <span className="font-semibold text-emerald-700 block mb-1">
                            💡 Rekomendasi Balasan CS:
                          </span>
                          <span className="italic text-slate-600">
                            &ldquo;{latestInteraction.recommendedReply}&rdquo;
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
