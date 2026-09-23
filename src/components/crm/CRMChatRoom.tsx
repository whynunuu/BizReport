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
  ArrowLeft,
  RefreshCw,
  Pin,
  ArrowDownCircle,
  CreditCard,
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
  followUpDueDate: Date | string | null;
  aiConfidence: number | null;
  needsFollowUp: boolean;
  followUpStatus: string | null;
  isHighPriority: boolean;
  usedStrongAi: boolean;
  handledByAdmin: string | null;
  createdAt: Date | string;
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
  updatedAt: Date | string;
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

function formatTime(date: Date | string | null | undefined) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Kemarin";
  if (diffDays < 7) return d.toLocaleDateString("id-ID", { weekday: "short" });
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

// ─── Aturan Validasi Konversi (Strict Rule) ──────────────────────────────────
// Lead HANYA dianggap konversi jika sudah mengirim bukti SS transfer sah (DP / Pelunasan)
export function isLeadVerifiedBooking(lead: Lead | null | undefined): boolean {
  if (!lead) return false;
  return Boolean(
    (lead.status === "BOOKING" || lead.hasBooking) &&
    (Boolean(lead.bookingNotes) || (lead.revenue !== null && lead.revenue > 0))
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CRMChatRoom({ leads: initialLeads }: Props) {
  const [leadsState, setLeadsState] = useState<Lead[]>(initialLeads);
  const [selectedFilter, setSelectedFilter] = useState<MetricFilter>("ALL");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"list" | "chat">("list");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversionMessageRef = useRef<HTMLDivElement>(null);

  // Sync Raw Files state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Manual Mark Booking Modal state
  const [showMarkBookingModal, setShowMarkBookingModal] = useState(false);
  const [bookingPaymentType, setBookingPaymentType] = useState<"DP" | "Pelunasan">("DP");
  const [bookingAmount, setBookingAmount] = useState<number>(150000);
  const [bookingBank, setBookingBank] = useState<string>("BCA");
  const [bookingNotesInput, setBookingNotesInput] = useState<string>("");
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Sync state whenever server component re-fetches (AutoRefresher 10s)
  useEffect(() => {
    setLeadsState(initialLeads);
  }, [initialLeads]);

  // Metrics aggregation: Urgent is true only if the LATEST message is high priority or lead is HOT
  const totalLeads = leadsState.length;
  const highPriorityCount = leadsState.filter((l) => {
    const lastMsg = [...l.interactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    return (lastMsg?.isHighPriority ?? false) || l.temperature === "HOT";
  }).length;
  const followUpCount = leadsState.filter((l) =>
    l.interactions.some((i) => i.needsFollowUp)
  ).length;
  // Konversi HANYA dihitung jika mengirimkan bukti transfer DP / Pelunasan sah
  const bookingCount = leadsState.filter((l) => isLeadVerifiedBooking(l)).length;
  const totalRevenue = leadsState.reduce((sum, l) => sum + (l.revenue || 0), 0);

  // Filtered leads based on clicked metric card + search text
  const filteredLeads = useMemo(() => {
    return leadsState.filter((l) => {
      // 1. Text Search
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        (l.name ?? "").toLowerCase().includes(q) ||
        l.phoneNumber.includes(q) ||
        l.interactions.some((i) => i.messageText?.toLowerCase().includes(q));

      // 2. Metric Card Filter
      let matchMetric = true;
      const lastMsg = [...l.interactions].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      const isUrgent = (lastMsg?.isHighPriority ?? false) || l.temperature === "HOT";

      if (selectedFilter === "URGENT") {
        matchMetric = isUrgent;
      } else if (selectedFilter === "FOLLOWUP") {
        matchMetric = l.interactions.some((i) => i.needsFollowUp);
      } else if (selectedFilter === "BOOKING") {
        matchMetric = isLeadVerifiedBooking(l);
      }

      return matchSearch && matchMetric;
    });
  }, [leadsState, selectedFilter, search]);

  const [activeId, setActiveId] = useState<string | null>(initialLeads[0]?.id ?? null);

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
  }, [activeId, mobileTab]);

  const activeLead = leadsState.find((l) => l.id === activeId) ?? null;

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  // Smooth scroll to the specific conversion / receipt interaction bubble
  function scrollToConversionMessage() {
    conversionMessageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Regenerate AI reply for an existing interaction with the new human tone
  async function handleReanalyze(interactionId: string) {
    try {
      setReanalyzingId(interactionId);
      const res = await fetch("/api/crm/reanalyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interactionId }),
      });
      const data = await res.json();
      if (data.status === "success" && data.interaction) {
        // Update local state immediately
        setLeadsState((prev) =>
          prev.map((ld) => ({
            ...ld,
            interactions: ld.interactions.map((it) =>
              it.id === interactionId
                ? {
                    ...it,
                    recommendedReply: data.interaction.recommendedReply,
                    summary: data.interaction.summary,
                    suggestedAction: data.interaction.suggestedAction,
                    intentCategory: data.interaction.intentCategory,
                    sentiment: data.interaction.sentiment,
                    leadScore: data.interaction.leadScore,
                    urgencyScore: data.interaction.urgencyScore,
                  }
                : it
            ),
          }))
        );
      }
    } catch (err) {
      console.error("Gagal buat ulang draf balasan:", err);
    } finally {
      setReanalyzingId(null);
    }
  }

  // 1-Click Sync from Raw Files Hub
  async function handleSyncRawFiles() {
    try {
      setIsSyncing(true);
      setSyncStatusMsg("Sedang sinkronisasi data sesi foto dari Raw Files Hub...");
      const res = await fetch("/api/crm/sync-raw-files", { method: "POST" });
      const data = await res.json();
      if (data.status === "success") {
        setSyncStatusMsg(`✅ Sukses! ${data.syncedCount} sesi foto terdaftar sebagai Konversi Booking.`);
        setTimeout(() => {
          setSyncStatusMsg(null);
          window.location.reload();
        }, 1500);
      } else {
        alert("Gagal sinkron: " + (data.error || "Unknown error"));
        setSyncStatusMsg(null);
      }
    } catch (err) {
      console.error("Error syncing raw files:", err);
      alert("Terjadi kesalahan saat sinkronisasi.");
      setSyncStatusMsg(null);
    } finally {
      setIsSyncing(false);
    }
  }

  // Submit manual booking confirmation
  async function handleMarkBookingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeLead) return;
    try {
      setIsSubmittingBooking(true);
      const res = await fetch("/api/crm/mark-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: activeLead.id,
          paymentType: bookingPaymentType,
          amount: bookingAmount,
          bankName: bookingBank,
          notes: bookingNotesInput,
        }),
      });
      const data = await res.json();
      if (data.status === "success" && data.lead) {
        setLeadsState((prev) =>
          prev.map((ld) =>
            ld.id === activeLead.id
              ? {
                  ...ld,
                  status: "BOOKING",
                  hasBooking: true,
                  temperature: "HOT",
                  leadScore: 100,
                  revenue: data.lead.revenue,
                  bookingNotes: data.lead.bookingNotes,
                  interactions: [...ld.interactions, data.interaction],
                }
              : ld
          )
        );
        setShowMarkBookingModal(false);
        setBookingNotesInput("");
      } else {
        alert("Gagal menandai booking: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Gagal submit mark booking:", err);
      alert("Terjadi kesalahan saat memproses booking.");
    } finally {
      setIsSubmittingBooking(false);
    }
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

  // Check if lead is converted (Strict: HANYA jika mengirim bukti SS transfer DP / Pelunasan sah)
  const isLeadConverted = isLeadVerifiedBooking(activeLead);

  // Find the interaction that represents the payment receipt trigger
  const conversionInteraction = chatMessages.find(
    (m) =>
      m.ruleSignals?.includes("PAYMENT") ||
      (m.messageText && /bukti transfer|struk|transfer berhasil|dp via|pelunasan via/i.test(m.messageText))
  );

  const tc = tempConfig(activeLead?.temperature ?? null);

  // Handler for clicking metric cards
  const handleCardClick = (filterType: MetricFilter) => {
    if (selectedFilter === filterType && filterType !== "ALL") {
      setSelectedFilter("ALL"); // Toggle off to show all
    } else {
      setSelectedFilter(filterType);
    }
    setMobileTab("list");
  };

  const handleSelectCustomer = (leadId: string) => {
    setActiveId(leadId);
    setMobileTab("chat");
  };

  return (
    <div className="space-y-4">
      {/* ══════════ METRIC CARDS (INTERACTIVE / CLICKABLE) ══════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
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
            className="inline-flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
          >
            <X className="w-3 h-3" />
            Reset Filter
          </button>
        </div>
      )}

      {/* ══════════ CHAT ROOM SPLIT PANEL (RESPONSIVE) ══════════ */}
      <div className="flex flex-col md:flex-row h-[calc(100vh-16rem)] min-h-[550px] rounded-2xl border border-slate-200 shadow-xs overflow-hidden bg-white">
        
        {/* ─── SIDEBAR: CUSTOMER DIRECTORY LIST ─── */}
        <div
          className={`w-full md:w-84 shrink-0 flex flex-col border-r border-slate-100 bg-slate-50 ${
            mobileTab === "chat" ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Sync Status Banner */}
          {syncStatusMsg && (
            <div className="p-2.5 bg-emerald-50 border-b border-emerald-200 text-2xs text-emerald-800 font-medium flex items-center gap-1.5 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600 shrink-0" />
              <span>{syncStatusMsg}</span>
            </div>
          )}

          {/* Search Bar & Sync Button */}
          <div className="p-2.5 border-b border-slate-100 bg-white space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama, nomor, pesan..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder-slate-400 transition-all"
                />
              </div>
              <button
                type="button"
                onClick={handleSyncRawFiles}
                disabled={isSyncing}
                title="Tarik data job photoshoot dari Raw Files Hub ke Konversi Booking CRM"
                className="p-2 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-700 rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-amber-600" : ""}`} />
              </button>
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
                    className="text-xs text-indigo-600 hover:underline font-semibold cursor-pointer"
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
                
                // Konversi status check (Strict: HANYA jika mengirim bukti transfer sah)
                const isConverted = isLeadVerifiedBooking(lead);
                const isUrgent = (lastMsg?.isHighPriority ?? false) || lead.temperature === "HOT";

                return (
                  <button
                    key={lead.id}
                    onClick={() => handleSelectCustomer(lead.id)}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 cursor-pointer relative ${
                      isConverted
                        ? isActive
                          ? "bg-emerald-50/90 border-l-4 border-emerald-600 ring-1 ring-emerald-400/30"
                          : "bg-emerald-50/30 hover:bg-emerald-50/70 border-l-4 border-emerald-500"
                        : isActive
                        ? "bg-indigo-50/80 border-l-4 border-indigo-600"
                        : "hover:bg-slate-100/80 border-l-4 border-transparent"
                    }`}
                  >
                    {/* Customer Avatar */}
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                        isConverted ? "from-emerald-500 to-teal-600 shadow-emerald-200" : avatarColor(displayName)
                      } flex items-center justify-center text-white font-bold text-sm shrink-0 mt-0.5 shadow-2xs relative`}
                    >
                      {initials}
                      {/* Pinned conversion badge on avatar */}
                      {isConverted && (
                        <span className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-xs border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        </span>
                      )}
                    </div>

                    {/* Customer Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-slate-900 text-xs truncate">
                          {displayName}
                        </span>
                        {/* Temperature or Converted Badge */}
                        {isConverted ? (
                          <span className="text-2xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shrink-0 shadow-2xs">
                            <Pin className="w-2.5 h-2.5 text-emerald-700" />
                            <span>DEAL / BOOKING</span>
                          </span>
                        ) : (
                          <span
                            className={`text-2xs font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${tc2.bg} ${tc2.text} ${tc2.border}`}
                          >
                            {tc2.label}
                          </span>
                        )}
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
                        {isConverted && (
                          <span className="text-2xs bg-emerald-600 text-white px-2 py-0.5 rounded-md font-bold shadow-2xs flex items-center gap-1">
                            <span>✓</span>
                            <span>{lead.revenue ? `Rp ${lead.revenue.toLocaleString("id-ID")}` : "Sudah Bayar"}</span>
                          </span>
                        )}

                        {isUrgent && lead.temperature !== "COLD" && !isConverted && (
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
        <div
          className={`flex-1 flex flex-col min-w-0 bg-slate-50/50 ${
            mobileTab === "list" ? "hidden md:flex" : "flex"
          }`}
        >
          {!activeLead ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 space-y-3">
              <MessageSquare className="w-12 h-12 opacity-30" />
              <p className="text-sm font-medium text-slate-500">Pilih salah satu pelanggan di sebelah kiri</p>
              <p className="text-xs text-slate-400 text-center max-w-xs">
                Klik nama pelanggan untuk membuka ruang obrolan, membaca analisis Gemini AI, dan melihat draf balasan resmi.
              </p>
            </div>
          ) : (
            <>
              {/* ── Chat Header ── */}
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 shadow-2xs">
                <div className="flex items-center gap-3">
                  {/* Back to list button on mobile */}
                  <button
                    onClick={() => setMobileTab("list")}
                    className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Kembali ke daftar pesan"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                      isLeadConverted ? "from-emerald-500 to-teal-600" : avatarColor(activeLead.name || "?")
                    } flex items-center justify-center text-white font-bold text-sm shadow-2xs`}
                  >
                    {(activeLead.name || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">
                        {activeLead.name || "Customer Tanpa Nama"}
                      </span>
                      {isLeadConverted ? (
                        <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full font-extrabold flex items-center gap-1 shadow-2xs">
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>KONVERSI RESMI (BOOKING)</span>
                        </span>
                      ) : (
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full border ${tc.bg} ${tc.text} ${tc.border}`}
                        >
                          {tc.label}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2 sm:gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {activeLead.phoneNumber}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span>Owner: {activeLead.leadOwner || "Admin CS"}</span>
                      <span className="text-slate-300">·</span>
                      <span>Skor: {activeLead.leadScore ?? 0}/100</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setBookingPaymentType("DP");
                      setBookingAmount(150000);
                      setShowMarkBookingModal(true);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer ${
                      isLeadConverted
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                        : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      {isLeadConverted ? "Edit Pembayaran" : "Tandai Sudah Bayar"}
                    </span>
                    <span className="sm:hidden">{isLeadConverted ? "Edit" : "Bayar"}</span>
                  </button>

                  <a
                    href={`https://wa.me/${activeLead.phoneNumber.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Buka Chat WA</span>
                    <span className="sm:hidden">WA</span>
                  </a>
                </div>
              </div>

              {/* ══════════ STICKY PIN: BUKTI TRANSAKSI PEMBAYARAN TERVERIFIKASI ══════════ */}
              {isLeadConverted && (
                <div className="mx-4 sm:mx-5 mt-3.5 bg-gradient-to-r from-emerald-500/10 via-emerald-50 to-teal-50 border-2 border-emerald-400/80 rounded-2xl p-3.5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Pin className="w-5 h-5 fill-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-2xs font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          PIN BUKTI PEMBAYARAN SAH
                        </span>
                        {activeLead.revenue && activeLead.revenue > 0 ? (
                          <span className="text-xs font-black text-emerald-700">
                            Rp {activeLead.revenue.toLocaleString("id-ID")}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-800 font-semibold mt-1">
                        {activeLead.bookingNotes || "Bukti transfer telah diverifikasi sah oleh Gemini Vision AI"}
                      </p>
                      <p className="text-2xs text-slate-500 mt-0.5">
                        Status jadwal terkunci · Follow up otomatis dimatikan · Closing oleh {activeLead.leadOwner || "Admin"}
                      </p>
                    </div>
                  </div>

                  {/* Tombol Loncat ke Chat Bukti */}
                  {conversionInteraction && (
                    <button
                      onClick={scrollToConversionMessage}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
                      title="Lihat pesan struk transfer di dalam riwayat chat"
                    >
                      <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Lihat Struk di Chat</span>
                    </button>
                  )}
                </div>
              )}

              {/* ── Chat Messages Scroll Area ── */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
                {chatMessages.length === 0 && (
                  <p className="text-center text-slate-400 text-xs pt-8">Belum ada percakapan tercatat.</p>
                )}

                {chatMessages.map((msg) => {
                  const isThisConversionTrigger =
                    msg.id === conversionInteraction?.id ||
                    msg.intentCategory === "BOOKING" ||
                    msg.ruleSignals?.includes("PAYMENT") ||
                    msg.messageText?.toLowerCase().includes("bukti transfer");

                  return (
                    <div
                      key={msg.id}
                      ref={isThisConversionTrigger ? conversionMessageRef : undefined}
                      className={`space-y-2 rounded-2xl p-2 transition-all ${
                        isThisConversionTrigger
                          ? "bg-emerald-50/50 border border-emerald-300/80 ring-2 ring-emerald-400/20"
                          : ""
                      }`}
                    >
                      {/* Pinned Conversion Badge inside the message stream */}
                      {isThisConversionTrigger && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-1 pl-1">
                          <Pin className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                          <span>📌 MOMEN TRANSAKSI KONVERSI (BUKTI DP / PELUNASAN)</span>
                        </div>
                      )}

                      {/* 1. Customer Inbound Bubble (Left-aligned) */}
                      <div className="flex flex-col items-start max-w-[85%] sm:max-w-[75%]">
                        <span className="text-2xs text-slate-400 mb-1 pl-1 flex items-center gap-1">
                          <span>{activeLead.name || "Customer"}</span>
                          <span>·</span>
                          <span>{formatTime(msg.createdAt)}</span>
                          {msg.isHighPriority && activeLead.temperature !== "COLD" && (
                            <span className="ml-1 text-red-500 font-bold flex items-center gap-0.5">
                              <Flame className="w-3 h-3 inline" /> URGENT
                            </span>
                          )}
                        </span>
                        <div
                          className={`shadow-xs rounded-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl px-4 py-3 text-sm leading-relaxed ${
                            isThisConversionTrigger
                              ? "bg-white border-2 border-emerald-400 text-slate-900 font-medium"
                              : "bg-white border border-slate-200 text-slate-800"
                          }`}
                        >
                          {msg.messageText}
                        </div>
                        {msg.ruleSignals && (
                          <div className="flex gap-1 flex-wrap mt-1.5 pl-1">
                            {msg.ruleSignals.split(",").map((sig, i) => (
                              <span
                                key={i}
                                className={`px-1.5 py-0.5 rounded font-mono text-2xs ${
                                  isThisConversionTrigger
                                    ? "bg-emerald-100 text-emerald-800 font-semibold"
                                    : "bg-slate-200/60 text-slate-600"
                                }`}
                              >
                                {sig.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 2. AI Intelligence Box (Attached under customer message) */}
                      <div className="flex flex-col items-start max-w-[95%] sm:max-w-[85%] pl-1 sm:pl-2">
                        <div
                          className={`rounded-xl px-3.5 sm:px-4 py-3 text-xs leading-relaxed space-y-2.5 border w-full shadow-2xs ${
                            isThisConversionTrigger
                              ? "bg-emerald-50 border-emerald-300"
                              : "bg-indigo-50/70 border-indigo-100"
                          }`}
                        >
                          {/* Intent & Scores Bar */}
                          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-indigo-100/60 pb-2">
                            <div className="flex items-center gap-2">
                              <Sparkles
                                className={`w-3.5 h-3.5 ${
                                  isThisConversionTrigger ? "text-emerald-600" : "text-indigo-600"
                                }`}
                              />
                              <span
                                className={`font-bold text-xs ${
                                  isThisConversionTrigger ? "text-emerald-900" : "text-indigo-900"
                                }`}
                              >
                                {isThisConversionTrigger ? "Verifikasi Vision AI: KONVERSI" : "Analisis AI Gemini"}
                              </span>
                              {msg.intentCategory && (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-2xs font-bold ${
                                    isThisConversionTrigger
                                      ? "bg-emerald-200 text-emerald-800"
                                      : "bg-indigo-100 text-indigo-700"
                                  }`}
                                >
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
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleReanalyze(msg.id)}
                                    disabled={reanalyzingId === msg.id}
                                    className="flex items-center gap-1 text-2xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors cursor-pointer disabled:opacity-50"
                                    title="Buat ulang draf dengan gaya human AI terbaru"
                                  >
                                    <RefreshCw className={`w-3 h-3 ${reanalyzingId === msg.id ? "animate-spin" : ""}`} />
                                    <span>{reanalyzingId === msg.id ? "Memproses..." : "Regenerate AI"}</span>
                                  </button>
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
                              </div>
                              <p className="italic text-slate-700 text-xs leading-relaxed">
                                &ldquo;{msg.recommendedReply}&rdquo;
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* ── Fixed Bottom Action Bar: Latest AI Draft ── */}
              {latestWithReply && (
                <div className="border-t border-slate-200 px-4 sm:px-6 py-3.5 bg-white shrink-0 shadow-lg">
                  <div className="text-2xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-indigo-700">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Draf Balasan AI Terkini (Siap Review &amp; Kirim ke WhatsApp)
                    </span>
                    <button
                      onClick={() => handleReanalyze(latestWithReply.id)}
                      disabled={reanalyzingId === latestWithReply.id}
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-bold transition-colors cursor-pointer disabled:opacity-50"
                      title="Perbarui draf lama ini dengan AI gaya ramah humanis terbaru"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${reanalyzingId === latestWithReply.id ? "animate-spin" : ""}`} />
                      <span>{reanalyzingId === latestWithReply.id ? "Sedang Menganalisis Ulang..." : "⚡ Buat Ulang dengan AI Human"}</span>
                    </button>
                  </div>
                  <div className="flex gap-2 sm:gap-3 items-end">
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs text-slate-800 leading-relaxed italic min-h-[46px] max-h-24 overflow-y-auto">
                      &ldquo;{latestWithReply.recommendedReply}&rdquo;
                    </div>
                    <div className="flex flex-col gap-1.5 sm:gap-2 shrink-0">
                      <button
                        onClick={() => copyToClipboard(latestWithReply.recommendedReply!, "bottom-bar")}
                        className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
                      >
                        {copiedId === "bottom-bar" ? (
                          <>
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Copy Teks</span>
                            <span className="sm:hidden">Copy</span>
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
                        className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Kirim WA</span>
                        <span className="sm:hidden">Kirim</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {/* ══════════ MODAL: TANDAI SUDAH BAYAR (MANUAL CONVERSION) ══════════ */}
      {showMarkBookingModal && activeLead && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Konfirmasi Pembayaran (Booking)</h3>
                  <p className="text-2xs text-slate-300">
                    {activeLead.name || "Customer"} · {activeLead.phoneNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMarkBookingModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleMarkBookingSubmit} className="p-5 space-y-4">
              {/* 1. Jenis Pembayaran */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Jenis Pembayaran:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBookingPaymentType("DP");
                      setBookingAmount(150000);
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      bookingPaymentType === "DP"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    DP (Uang Muka)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBookingPaymentType("Pelunasan");
                      setBookingAmount(350000);
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      bookingPaymentType === "Pelunasan"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Pelunasan Penuh
                  </button>
                </div>
              </div>

              {/* 2. Nominal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nominal Pembayaran (Rp):
                </label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={5000}
                  value={bookingAmount}
                  onChange={(e) => setBookingAmount(Number(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                  placeholder="Contoh: 150000"
                />
                {/* Presets */}
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {[150000, 200000, 350000, 400000, 500000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setBookingAmount(amt)}
                      className="text-2xs font-semibold px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      Rp {(amt / 1000).toLocaleString("id-ID")}rb
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Bank / Metode */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Metode Pembayaran:
                </label>
                <select
                  value={bookingBank}
                  onChange={(e) => setBookingBank(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                >
                  <option value="BCA">BCA (Bank Central Asia)</option>
                  <option value="Mandiri">Bank Mandiri</option>
                  <option value="BRI">Bank BRI</option>
                  <option value="BNI">Bank BNI</option>
                  <option value="QRIS">QRIS Foxe Studio</option>
                  <option value="Cash di Studio">Cash / Tunai di Studio</option>
                </select>
              </div>

              {/* 4. Catatan Tambahan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Catatan Transaksi (Opsional):
                </label>
                <input
                  type="text"
                  value={bookingNotesInput}
                  onChange={(e) => setBookingNotesInput(e.target.value)}
                  placeholder="Contoh: Paket Graduation UGM, sesi tgl 28 Sept"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMarkBookingModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBooking}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingBooking ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Simpan &amp; Konversi Resmi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
