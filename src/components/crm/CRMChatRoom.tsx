"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Send,
  Sparkles,
  Phone,
  Copy,
  CheckCheck,
  Flame,
  Clock,
  Search,
  Receipt,
  ChevronRight,
  MessageSquare,
  CheckCircle2,
  Filter,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Interaction {
  id: string;
  direction: string;
  messageText: string;
  intentCategory: string | null;
  sentiment: string | null;
  urgencyScore: number;
  leadScore: number;
  temperature: string | null;
  ruleSignals: string | null;
  summary: string | null;
  recommendedReply: string | null;
  suggestedAction: string | null;
  priorityReason: string | null;
  followUpReason: string | null;
  followUpDueDate: Date | null;
  aiConfidence: number | null;
  needsFollowUp: boolean;
  followUpStatus: string | null;
  isHighPriority: boolean;
  usedStrongAi: boolean;
  handledByAdmin: string | null;
  createdAt: Date;
}

export interface Lead {
  id: string;
  name: string | null;
  phoneNumber: string;
  status: string;
  temperature: string | null;
  leadScore: number | null;
  leadOwner: string | null;
  hasBooking: boolean;
  revenue: number | null;
  bookingNotes: string | null;
  updatedAt: Date;
  interactions: Interaction[];
}

interface Props {
  leads: Lead[];
}

type MetricFilter = "ALL" | "URGENT" | "FOLLOWUP" | "BOOKING";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function tempConfig(temp: string | null) {
  switch (temp) {
    case "HOT":
      return { label: "🔥 HOT", bg: "bg-red-100", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" };
    case "WARM":
      return { label: "🟡 WARM", bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-400" };
    default:
      return { label: "❄️ COLD", bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200", dot: "bg-slate-400" };
  }
}

function avatarColor(name: string) {
  const colors = [
    "from-violet-500 to-indigo-600",
    "from-rose-500 to-pink-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-sky-500 to-blue-600",
    "from-fuchsia-500 to-purple-600",
  ];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return colors[hash % colors.length];
}

function formatTime(date: Date) {
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Kemarin";
  if (diffDays < 7) return d.toLocaleDateString("id-ID", { weekday: "short" });
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CRMChatRoom({ leads }: Props) {
  const [selectedFilter, setSelectedFilter] = useState<MetricFilter>("ALL");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Metrics aggregation
  const totalLeads = leads.length;
  const highPriorityCount = leads.filter((l) =>
    l.interactions.some((i) => i.isHighPriority) || l.temperature === "HOT"
  ).length;
  const followUpCount = leads.filter((l) =>
    l.interactions.some((i) => i.needsFollowUp)
  ).length;
  const bookingCount = leads.filter(
    (l) => l.status === "BOOKING" || l.status === "QUALIFIED" || l.hasBooking
  ).length;
  const totalRevenue = leads.reduce((sum, l) => sum + (l.revenue || 0), 0);

  // Filtered leads based on clicked metric card + search text
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      // 1. Text Search
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        (l.name ?? "").toLowerCase().includes(q) ||
        l.phoneNumber.includes(q) ||
        l.interactions.some((i) => i.messageText?.toLowerCase().includes(q));

      // 2. Metric Card Filter
      let matchMetric = true;
      if (selectedFilter === "URGENT") {
        matchMetric = l.interactions.some((i) => i.isHighPriority) || l.temperature === "HOT";
      } else if (selectedFilter === "FOLLOWUP") {
        matchMetric = l.interactions.some((i) => i.needsFollowUp);
      } else if (selectedFilter === "BOOKING") {
        matchMetric = l.status === "BOOKING" || l.status === "QUALIFIED" || l.hasBooking;
      }

      return matchSearch && matchMetric;
    });
  }, [leads, selectedFilter, search]);

  const [activeId, setActiveId] = useState<string | null>(leads[0]?.id ?? null);

  // Auto-select first lead in filtered list if active lead is not in filtered leads
  useEffect(() => {
    if (filteredLeads.length > 0) {
      if (!filteredLeads.some((l) => l.id === activeId)) {
        setActiveId(filteredLeads[0].id);
      }
    } else {
      setActiveId(null);
    }
  }, [filteredLeads, activeId]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId]);

  const activeLead = leads.find((l) => l.id === activeId) ?? null;

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  // Latest interaction with a reply (for the draft reply bar)
  const latestWithReply = activeLead?.interactions
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .find((i) => i.recommendedReply);

  // Interactions sorted chronologically (oldest-first for chat history)
  const chatMessages = activeLead
    ? [...activeLead.interactions].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    : [];

  const tc = tempConfig(activeLead?.temperature ?? null);

  // Handler for clicking metric cards
  const handleCardClick = (filterType: MetricFilter) => {
    if (selectedFilter === filterType && filterType !== "ALL") {
      setSelectedFilter("ALL"); // Toggle off to show all
    } else {
      setSelectedFilter(filterType);
    }
  };

  return (
    <div className="space-y-4">
      {/* ══════════ METRIC CARDS (INTERACTIVE / CLICKABLE) ══════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Total Leads */}
        <button
          type="button"
          onClick={() => handleCardClick("ALL")}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex items-center gap-3.5 ${
            selectedFilter === "ALL"
              ? "bg-blue-50/90 border-blue-400 shadow-sm ring-2 ring-blue-500/20"
              : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
          }`}
        >
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              selectedFilter === "ALL" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-bold text-slate-900 leading-tight">{totalLeads}</div>
            <div className="text-xs text-slate-500 font-medium truncate">Total Leads Terdata</div>
          </div>
          {selectedFilter === "ALL" && (
            <span className="absolute top-2 right-2 text-2xs font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-md">
              Aktif
            </span>
          )}
        </button>

        {/* Card 2: Prioritas Tinggi / Urgent */}
        <button
          type="button"
          onClick={() => handleCardClick("URGENT")}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex items-center gap-3.5 ${
            selectedFilter === "URGENT"
              ? "bg-red-50/90 border-red-400 shadow-sm ring-2 ring-red-500/20"
              : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
          }`}
        >
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              selectedFilter === "URGENT" ? "bg-red-600 text-white" : "bg-red-50 text-red-600"
            }`}
          >
            <Flame className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-bold text-red-600 leading-tight">{highPriorityCount}</div>
            <div className="text-xs text-slate-500 font-medium truncate">Prioritas Tinggi / Urgent</div>
          </div>
          {selectedFilter === "URGENT" && (
            <span className="absolute top-2 right-2 text-2xs font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-md">
              Aktif
            </span>
          )}
        </button>

        {/* Card 3: Antrian Follow-Up */}
        <button
          type="button"
          onClick={() => handleCardClick("FOLLOWUP")}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex items-center gap-3.5 ${
            selectedFilter === "FOLLOWUP"
              ? "bg-amber-50/90 border-amber-400 shadow-sm ring-2 ring-amber-500/20"
              : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
          }`}
        >
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              selectedFilter === "FOLLOWUP" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-600"
            }`}
          >
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-bold text-amber-600 leading-tight">{followUpCount}</div>
            <div className="text-xs text-slate-500 font-medium truncate">Antrian Follow-Up</div>
          </div>
          {selectedFilter === "FOLLOWUP" && (
            <span className="absolute top-2 right-2 text-2xs font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md">
              Aktif
            </span>
          )}
        </button>

        {/* Card 4: Konversi Booking */}
        <button
          type="button"
          onClick={() => handleCardClick("BOOKING")}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex items-center gap-3.5 ${
            selectedFilter === "BOOKING"
              ? "bg-emerald-50/90 border-emerald-400 shadow-sm ring-2 ring-emerald-500/20"
              : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
          }`}
        >
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              selectedFilter === "BOOKING" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600"
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-bold text-emerald-600 leading-tight">{bookingCount} Leads</div>
            <div className="text-xs text-slate-500 font-medium truncate">
              Konversi Booking {totalRevenue > 0 ? `(Rp ${totalRevenue.toLocaleString("id-ID")})` : ""}
            </div>
          </div>
          {selectedFilter === "BOOKING" && (
            <span className="absolute top-2 right-2 text-2xs font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
              Aktif
            </span>
          )}
        </button>
      </div>

      {/* ══════════ ACTIVE FILTER BANNER (IF FILTERED) ══════════ */}
      {selectedFilter !== "ALL" && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Menampilkan filter:{" "}
              <strong>
                {selectedFilter === "URGENT" && "🔥 Prioritas Tinggi / Urgent"}
                {selectedFilter === "FOLLOWUP" && "⏰ Antrian Follow-Up"}
                {selectedFilter === "BOOKING" && "📦 Konversi Booking"}
              </strong>{" "}
              ({filteredLeads.length} pelanggan ditemukan)
            </span>
          </div>
          <button
            onClick={() => setSelectedFilter("ALL")}
            className="inline-flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-all"
          >
            <X className="w-3 h-3" />
            Reset Filter
          </button>
        </div>
      )}

      {/* ══════════ CHAT ROOM SPLIT PANEL ══════════ */}
      <div className="flex h-[calc(100vh-16rem)] min-h-[550px] rounded-2xl border border-slate-200 shadow-xs overflow-hidden bg-white">
        {/* ─── SIDEBAR: CUSTOMER LIST ─── */}
        <div className="w-80 shrink-0 flex flex-col border-r border-slate-100 bg-slate-50">
          {/* Search Bar */}
          <div className="p-3 border-b border-slate-100 bg-white space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, nomor, isi pesan..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-slate-400 transition-all"
              />
            </div>
          </div>

          {/* Customer Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredLeads.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs font-medium">Tidak ada pelanggan di kategori ini.</p>
                {selectedFilter !== "ALL" && (
                  <button
                    onClick={() => setSelectedFilter("ALL")}
                    className="text-xs text-indigo-600 hover:underline font-semibold"
                  >
                    Tampilkan Semua Leads
                  </button>
                )}
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const isActive = lead.id === activeId;
                const tc2 = tempConfig(lead.temperature);
                const lastMsg = [...lead.interactions].sort(
                  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )[0];
                const displayName = lead.name || "Customer";
                const initials = displayName.slice(0, 1).toUpperCase();
                const isUrgent = lead.interactions.some((i) => i.isHighPriority) || lead.temperature === "HOT";

                return (
                  <button
                    key={lead.id}
                    onClick={() => setActiveId(lead.id)}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 cursor-pointer ${
                      isActive
                        ? "bg-indigo-50/80 border-l-4 border-indigo-600"
                        : "hover:bg-slate-100/80 border-l-4 border-transparent"
                    }`}
                  >
                    {/* Customer Avatar */}
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor(
                        displayName
                      )} flex items-center justify-center text-white font-bold text-sm shrink-0 mt-0.5 shadow-2xs`}
                    >
                      {initials}
                    </div>

                    {/* Customer Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-slate-900 text-xs truncate">
                          {displayName}
                        </span>
                        <span
                          className={`text-2xs font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${tc2.bg} ${tc2.text} ${tc2.border}`}
                        >
                          {tc2.label}
                        </span>
                      </div>

                      <div className="text-2xs text-slate-400 mb-1 font-mono flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" />
                        {lead.phoneNumber}
                      </div>

                      {lastMsg && (
                        <p className="text-2xs text-slate-600 line-clamp-1 italic">
                          &ldquo;{lastMsg.messageText}&rdquo;
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {lead.hasBooking || lead.status === "BOOKING" ? (
                          <span className="text-2xs bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold border border-emerald-200">
                            ✓ Booking
                          </span>
                        ) : null}

                        {isUrgent && (
                          <span className="text-2xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold animate-pulse">
                            Urgent
                          </span>
                        )}

                        <span className="text-2xs bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded">
                          {lead.interactions.length} pesan
                        </span>

                        {lastMsg && (
                          <span className="text-2xs text-slate-400 ml-auto shrink-0 font-medium">
                            {formatTime(lastMsg.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ─── MAIN: CHAT ROOM AREA ─── */}
        {!activeLead ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 space-y-3">
            <MessageSquare className="w-12 h-12 opacity-30" />
            <p className="text-sm font-medium text-slate-500">Pilih salah satu pelanggan di sebelah kiri</p>
            <p className="text-xs text-slate-400 text-center max-w-xs">
              Klik nama pelanggan untuk membuka ruang obrolan, membaca analisis Gemini AI, dan melihat draf balasan resmi.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
            {/* ── Chat Header ── */}
            <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 shadow-2xs">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarColor(
                    activeLead.name || "?"
                  )} flex items-center justify-center text-white font-bold text-base shadow-2xs`}
                >
                  {(activeLead.name || "?").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">
                      {activeLead.name || "Customer Tanpa Nama"}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full border ${tc.bg} ${tc.text} ${tc.border}`}
                    >
                      {tc.label}
                    </span>
                    {activeLead.hasBooking && (
                      <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-2xs">
                        <CheckCheck className="w-3 h-3 text-emerald-600" /> BOOKING TERKONFIRMASI
                        {(activeLead.revenue ?? 0) > 0 &&
                          ` • Rp ${activeLead.revenue!.toLocaleString("id-ID")}`}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {activeLead.phoneNumber}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span>Owner: {activeLead.leadOwner || "Admin CS"}</span>
                    <span className="text-slate-300">·</span>
                    <span>Skor Lead: {activeLead.leadScore ?? 0}/100</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <a
                  href={`https://wa.me/${activeLead.phoneNumber.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  Buka Chat WA
                </a>
              </div>
            </div>

            {/* ── Booking Struk Banner (Jika Ada) ── */}
            {activeLead.bookingNotes && (
              <div className="mx-5 mt-3 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium shadow-2xs">
                <Receipt className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Struk Pembayaran Sah:</strong> {activeLead.bookingNotes}
                </span>
              </div>
            )}

            {/* ── Chat Messages Scroll Area ── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {chatMessages.length === 0 && (
                <p className="text-center text-slate-400 text-xs pt-8">Belum ada percakapan tercatat.</p>
              )}

              {chatMessages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  {/* 1. Customer Inbound Bubble (Left-aligned) */}
                  <div className="flex flex-col items-start max-w-[75%]">
                    <span className="text-2xs text-slate-400 mb-1 pl-1 flex items-center gap-1">
                      <span>{activeLead.name || "Customer"}</span>
                      <span>·</span>
                      <span>{formatTime(msg.createdAt)}</span>
                      {msg.isHighPriority && (
                        <span className="ml-1 text-red-500 font-bold flex items-center gap-0.5">
                          <Flame className="w-3 h-3 inline" /> URGENT
                        </span>
                      )}
                    </span>
                    <div className="bg-white border border-slate-200 shadow-xs rounded-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl px-4 py-3 text-sm text-slate-800 leading-relaxed">
                      {msg.messageText}
                    </div>
                    {msg.ruleSignals && (
                      <div className="flex gap-1 flex-wrap mt-1.5 pl-1">
                        {msg.ruleSignals.split(",").map((sig, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 bg-slate-200/60 text-slate-600 rounded font-mono text-2xs"
                          >
                            {sig.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. AI Intelligence Box (Attached under customer message) */}
                  <div className="flex flex-col items-start max-w-[85%] pl-2">
                    <div
                      className={`rounded-xl px-4 py-3 text-xs leading-relaxed space-y-2.5 border w-full shadow-2xs ${
                        msg.isHighPriority || (msg.intentCategory === "BOOKING" && msg.ruleSignals?.includes("PAYMENT"))
                          ? "bg-emerald-50/80 border-emerald-200"
                          : "bg-indigo-50/70 border-indigo-100"
                      }`}
                    >
                      {/* Intent & Scores Bar */}
                      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-indigo-100/60 pb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="font-bold text-indigo-900 text-xs">Analisis AI Gemini</span>
                          {msg.intentCategory && (
                            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-2xs font-bold">
                              {msg.intentCategory}
                            </span>
                          )}
                          {msg.sentiment && (
                            <span className="bg-white text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full text-2xs">
                              {msg.sentiment}
                            </span>
                          )}
                        </div>
                        <span className="text-2xs text-slate-500 font-medium">
                          Skor {msg.leadScore}/100 · Urgensi {msg.urgencyScore}/5
                        </span>
                      </div>

                      {/* Summary */}
                      {msg.summary && (
                        <p className="text-slate-700 text-xs">
                          <span className="font-semibold text-slate-900">Kebutuhan: </span>
                          {msg.summary}
                        </p>
                      )}

                      {/* Suggested Action */}
                      {msg.suggestedAction && (
                        <div className="flex items-center gap-2 bg-white/90 border border-indigo-100 rounded-lg px-3 py-2">
                          <ChevronRight className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="font-bold text-indigo-800">Tindakan CS: </span>
                          <span className="text-slate-700">{msg.suggestedAction}</span>
                        </div>
                      )}

                      {/* Recommended Reply (Human-in-the-loop preview) */}
                      {msg.recommendedReply && (
                        <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-600 text-2xs flex items-center gap-1">
                              💬 Rekomendasi Balasan CS (Gaya Human &amp; Ramah)
                            </span>
                            <button
                              onClick={() => copyToClipboard(msg.recommendedReply!, msg.id)}
                              className="flex items-center gap-1 text-2xs text-slate-500 hover:text-indigo-600 font-semibold transition-colors cursor-pointer"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <CheckCheck className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600">Tersalin!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  Copy Teks
                                </>
                              )}
                            </button>
                          </div>
                          <p className="italic text-slate-700 text-xs leading-relaxed">
                            &ldquo;{msg.recommendedReply}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Fixed Bottom Action Bar: Latest AI Draft ── */}
            {latestWithReply && (
              <div className="border-t border-slate-200 px-6 py-3.5 bg-white shrink-0 shadow-lg">
                <div className="text-2xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-indigo-700">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Draf Balasan AI Terkini (Siap Review &amp; Kirim ke WhatsApp)
                  </span>
                  <span className="text-slate-400 font-normal">Human-in-the-loop</span>
                </div>
                <div className="flex gap-3 items-end">
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 leading-relaxed italic min-h-[46px] max-h-24 overflow-y-auto">
                    &ldquo;{latestWithReply.recommendedReply}&rdquo;
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => copyToClipboard(latestWithReply.recommendedReply!, "bottom-bar")}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
                    >
                      {copiedId === "bottom-bar" ? (
                        <>
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Teks</span>
                        </>
                      )}
                    </button>
                    <a
                      href={`https://wa.me/${activeLead.phoneNumber.replace(
                        /\D/g,
                        ""
                      )}?text=${encodeURIComponent(latestWithReply.recommendedReply!)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim WA</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
