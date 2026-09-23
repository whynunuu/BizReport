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
  Image as ImageIcon,
  ExternalLink,
  Calendar,
  Pencil,
  Target,
  Percent,
  RotateCcw,
} from "lucide-react";
import MonthlyCalendarTracker from "./MonthlyCalendarTracker";
import DailyReportModal, { LogOrderEntry } from "./DailyReportModal";
import logOrderRaw from "@/data/log_order_dp.json";

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
  closingAdmin?: string | null;
  source?: string | null;
  hasBooking: boolean;
  revenue: number | null;
  bookingNotes: string | null;
  createdAt?: Date | string;
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

// ─── Aturan Validasi Konversi (Strict DP-Only Rule) ──────────────────────────
// Sesuai aturan bisnis Foxe Studio: Leads HANYA dihitung konversi jika sudah
// mengirimkan bukti transfer DP (Down Payment / Uang Muka) yang sah terverifikasi.
export function isLeadVerifiedDPBooking(lead: Lead | null | undefined): boolean {
  if (!lead) return false;
  const isBooking = lead.status === "BOOKING" || lead.hasBooking;
  if (!isBooking) return false;

  // Wajib ada catatan DP atau sinyal DP sah dari interaksi / OCR struk
  const hasDPInNotes = Boolean(
    lead.bookingNotes && /\b(dp|down payment|uang muka)\b/i.test(lead.bookingNotes)
  );
  const hasDPInInteractions = Boolean(
    lead.interactions?.some((i) =>
      /\b(dp|down payment|uang muka)\b/i.test(i.ruleSignals || "") ||
      /\[konfirmasi pembayaran\]\s*dp/i.test(i.messageText || "") ||
      /\bdp via\b/i.test(i.messageText || "")
    )
  );

  return hasDPInNotes || hasDPInInteractions;
}
export const isLeadVerifiedBooking = isLeadVerifiedDPBooking;

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

  // Log Order Sync state
  const [isSyncingLogOrder, setIsSyncingLogOrder] = useState(false);
  const [logSyncMsg, setLogSyncMsg] = useState<string | null>(null);

  // Manual Mark Booking Modal state
  const [showMarkBookingModal, setShowMarkBookingModal] = useState(false);
  const [bookingPaymentType, setBookingPaymentType] = useState<"DP" | "Pelunasan">("DP");
  const [bookingAmount, setBookingAmount] = useState<number>(150000);
  const [bookingBank, setBookingBank] = useState<string>("BCA");
  const [bookingNotesInput, setBookingNotesInput] = useState<string>("");
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [selectedImageModalUrl, setSelectedImageModalUrl] = useState<string | null>(null);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);
  const [dailyReportModalDay, setDailyReportModalDay] = useState<number | null>(null);

  // Manual Inbound Chats state (saved in localStorage per day)
  const [dailyInboundChats, setDailyInboundChats] = useState<Record<number, number>>({});
  const [showInputChatModal, setShowInputChatModal] = useState(false);
  const [inputChatDay, setInputChatDay] = useState<number>(23);
  const [inputChatVal, setInputChatVal] = useState<number>(0);

  // Load saved daily inbound chats from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("foxe_crm_daily_inbound_chats");
      if (saved) {
        setDailyInboundChats(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Error reading daily inbound chats from localStorage", e);
    }
  }, []);

  function handleSaveDailyInboundChats(e: React.FormEvent) {
    e.preventDefault();
    if (inputChatVal < 0) return;
    setDailyInboundChats((prev) => {
      const updated = { ...prev, [inputChatDay]: inputChatVal };
      try {
        localStorage.setItem("foxe_crm_daily_inbound_chats", JSON.stringify(updated));
      } catch (err) {
        console.error("Error saving daily inbound chats", err);
      }
      return updated;
    });
    setShowInputChatModal(false);
  }

  // Reset manual override back to automatic CRM counting for this day
  function handleResetDailyInboundChats(dayToReset: number) {
    setDailyInboundChats((prev) => {
      const next = { ...prev };
      delete next[dayToReset];
      try {
        localStorage.setItem("foxe_crm_daily_inbound_chats", JSON.stringify(next));
      } catch (err) {
        console.error("Error updating localStorage", err);
      }
      return next;
    });
    setShowInputChatModal(false);
  }

  // Sync state whenever server component re-fetches (AutoRefresher 10s)
  useEffect(() => {
    setLeadsState(initialLeads);
  }, [initialLeads]);

  // Helper untuk memfilter leads CRM yang aktif pada tanggal tertentu (September 2026 atau tanggal berjalan)
  const getCrmLeadsForDay = (targetDay: number) => {
    const dayRecords = (logOrderRaw as LogOrderEntry[]).filter(
      (r) => r.day === targetDay
    );
    const dayClientsClean = dayRecords.map((r) =>
      r.client.toLowerCase().replace(/[^a-z0-9]/g, "")
    );

    return leadsState.filter((l) => {
      // 1. Aktivitas interaksi WhatsApp pada tanggal ini (otomatis tercatat untuk chat hari ini dan hari selanjutnya)
      const hadChatOnDay = l.interactions.some((i) => {
        const d = new Date(i.createdAt);
        return d.getDate() === targetDay && d.getMonth() === 8 && d.getFullYear() === 2026;
      });

      // 2. Atau lead dibuat pada tanggal ini
      const leadCreatedOnDay = Boolean(
        l.createdAt && (() => {
          const d = new Date(l.createdAt!);
          return d.getDate() === targetDay && d.getMonth() === 8 && d.getFullYear() === 2026;
        })()
      );

      // 3. Atau pencocokan data klien Log Order DP manual
      const lNameClean = (l.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const matchedClient =
        (lNameClean &&
          dayClientsClean.some(
            (cn) =>
              cn && (cn === lNameClean || cn.includes(lNameClean) || lNameClean.includes(cn))
          )) ||
        l.phoneNumber.includes(`62800${String(targetDay).padStart(2, "0")}`) ||
        (l.bookingNotes &&
          dayRecords.some((r) =>
            l.bookingNotes!.toLowerCase().includes(r.client.toLowerCase())
          ));

      return hadChatOnDay || leadCreatedOnDay || matchedClient;
    });
  };

  // Saring scope dasar bila kalender tanggal tertentu dipilih
  const baseLeadsScope = useMemo(() => {
    if (selectedCalendarDay === null) return leadsState;
    return getCrmLeadsForDay(selectedCalendarDay);
  }, [leadsState, selectedCalendarDay]);

  // Metrics aggregation: Urgent is true only if the LATEST message is high priority or lead is HOT
  const totalLeads = baseLeadsScope.length;
  const highPriorityCount = baseLeadsScope.filter((l) => {
    const lastMsg = [...l.interactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    return (lastMsg?.isHighPriority ?? false) || l.temperature === "HOT";
  }).length;
  const followUpCount = baseLeadsScope.filter((l) =>
    l.interactions.some((i) => i.needsFollowUp)
  ).length;

  // Konversi HANYA dihitung jika mengirimkan bukti transfer DP (Down Payment) sah
  const dpConvertedLeads = baseLeadsScope.filter((l) => isLeadVerifiedDPBooking(l));
  const bookingCount = dpConvertedLeads.length;
  const totalRevenue = dpConvertedLeads.reduce((sum, l) => sum + (l.revenue || 0), 0);

  // Status Otomatis CRM vs Manual Override untuk hari aktif
  const activeDayForChat = selectedCalendarDay ?? 23;
  const crmAutoCountForDay = getCrmLeadsForDay(activeDayForChat).length;
  const manualCountForActiveDay = selectedCalendarDay !== null ? dailyInboundChats[selectedCalendarDay] : undefined;
  const isAutoChatCount = selectedCalendarDay !== null
    ? manualCountForActiveDay === undefined
    : Object.keys(dailyInboundChats).length === 0;

  // Total Chat Masuk & Closing Rate calculation (100% otomatis dari data CRM jika tidak ada override manual)
  const displayChatCount = useMemo(() => {
    if (selectedCalendarDay !== null) {
      return manualCountForActiveDay !== undefined ? manualCountForActiveDay : baseLeadsScope.length;
    }
    // Mode Semua Hari (Full Bulan):
    if (Object.keys(dailyInboundChats).length === 0) {
      return leadsState.length;
    }
    // Jika ada hari yang dioverride manual, jumlahkan per hari:
    let total = 0;
    for (let d = 1; d <= 30; d++) {
      if (dailyInboundChats[d] !== undefined) {
        total += dailyInboundChats[d];
      } else {
        total += getCrmLeadsForDay(d).length;
      }
    }
    return total > 0 ? total : leadsState.length;
  }, [selectedCalendarDay, manualCountForActiveDay, baseLeadsScope.length, dailyInboundChats, leadsState]);

  const conversionRate = displayChatCount > 0
    ? ((bookingCount / displayChatCount) * 100).toFixed(1)
    : "0.0";

  // Filtered leads based on clicked metric card + search text + calendar day
  const filteredLeads = useMemo(() => {
    return baseLeadsScope.filter((l) => {
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
        matchMetric = isLeadVerifiedDPBooking(l);
      }

      return matchSearch && matchMetric;
    });
  }, [baseLeadsScope, selectedFilter, search]);

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

  // Sinkronisasi data DP dari Log Order manual Google Sheets
  async function handleSyncLogOrder() {
    try {
      setIsSyncingLogOrder(true);
      setLogSyncMsg("Sedang menyinkronkan data DP dari Log Order manual studio...");
      const res = await fetch("/api/crm/sync-log-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.status === "success") {
        setLogSyncMsg(
          `✅ Sukses! ${data.data.matchedCount} chat WA dicocokkan & ${data.data.createdCount} klien DP baru disinkronkan.`
        );
        setTimeout(() => {
          setLogSyncMsg(null);
          window.location.reload();
        }, 1800);
      } else {
        alert("Gagal sinkron: " + (data.error || "Unknown error"));
        setLogSyncMsg(null);
      }
    } catch (err) {
      console.error("Error syncing log order:", err);
      alert("Terjadi kesalahan saat sinkronisasi Log Order.");
      setLogSyncMsg(null);
    } finally {
      setIsSyncingLogOrder(false);
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
      {/* ══════════ MONTHLY CALENDAR TRACKER (INTERACTIVE DAILY TRACKING) ══════════ */}
      <MonthlyCalendarTracker
        selectedDay={selectedCalendarDay}
        onSelectDay={(day) => setSelectedCalendarDay(day)}
        onOpenReport={(day) => setDailyReportModalDay(day)}
      />

      {/* ══════════ ACTIVE CALENDAR DAY FILTER BANNER ══════════ */}
      {selectedCalendarDay !== null && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2.5 bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-xl text-xs gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Menampilkan filter tanggal: <strong>{selectedCalendarDay} September 2026</strong> ({filteredLeads.length} leads aktif)
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setDailyReportModalDay(selectedCalendarDay)}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-medium cursor-pointer transition-colors flex items-center gap-1 shadow-2xs"
            >
              📄 Buka Laporan Harian
            </button>
            <button
              onClick={() => setSelectedCalendarDay(null)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white cursor-pointer transition-colors"
            >
              Tampilkan Semua Hari
            </button>
          </div>
        </div>
      )}

      {/* ══════════ METRIC CARDS (INTERACTIVE / FIT-IN 3-TIER HIERARCHY) ══════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Chat Masuk */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleCardClick("ALL")}
          onKeyDown={(e) => e.key === "Enter" && handleCardClick("ALL")}
          className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
            selectedFilter === "ALL"
              ? "bg-blue-50/90 border-blue-400 shadow-xs ring-2 ring-blue-500/20"
              : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
          }`}
        >
          {/* Header Row: Icon + Status Badges */}
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                selectedFilter === "ALL" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
            </div>

            <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
              {isAutoChatCount ? (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md"
                  title="Dihitung 100% otomatis dari data pesan WhatsApp CRM yang masuk"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Auto CRM</span>
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md"
                  title="Diatur manual oleh admin studio"
                >
                  <span>✏️ Manual</span>
                </span>
              )}
              {selectedFilter === "ALL" && (
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-md">
                  Aktif
                </span>
              )}
            </div>
          </div>

          {/* Metric Value & Label */}
          <div className="min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 leading-tight">
                {displayChatCount}
              </span>
              <span className="text-2xs text-slate-400 font-mono">Chat</span>
            </div>
            <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
              {selectedCalendarDay ? `Chat Masuk (Tgl ${selectedCalendarDay})` : "Total Chat Masuk"}
            </div>
          </div>

          {/* Footer Row: Closing Rate & Edit Button */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-2xs">
            <div className="flex items-center gap-1 text-slate-500">
              <Target className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="font-medium">Closing:</span>
              <span className="font-extrabold text-emerald-700 font-mono bg-emerald-50 px-1 rounded border border-emerald-200/60">
                {conversionRate}%
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setInputChatDay(selectedCalendarDay ?? 23);
                setInputChatVal(displayChatCount);
                setShowInputChatModal(true);
              }}
              className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors cursor-pointer border border-transparent hover:border-blue-200"
              title="Input / Ubah jumlah chat atau reset ke Auto CRM"
            >
              <Pencil className="w-2.5 h-2.5" />
              <span>Ubah</span>
            </button>
          </div>
        </div>

        {/* Card 2: Prioritas Tinggi / Urgent */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleCardClick("URGENT")}
          onKeyDown={(e) => e.key === "Enter" && handleCardClick("URGENT")}
          className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
            selectedFilter === "URGENT"
              ? "bg-red-50/90 border-red-400 shadow-xs ring-2 ring-red-500/20"
              : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
          }`}
        >
          {/* Header Row: Icon + Badges */}
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                selectedFilter === "URGENT" ? "bg-red-600 text-white" : "bg-red-50 text-red-600"
              }`}
            >
              <Flame className="w-4 h-4" />
            </div>

            {selectedFilter === "URGENT" && (
              <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-md">
                Aktif
              </span>
            )}
          </div>

          {/* Metric Value & Label */}
          <div className="min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-red-600 leading-tight">
                {highPriorityCount}
              </span>
              <span className="text-2xs text-slate-400 font-mono">Leads</span>
            </div>
            <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
              Prioritas Urgent
            </div>
          </div>

          {/* Footer Row */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-2xs">
            <span className="text-slate-500 font-medium">Status Antrian:</span>
            <span className={`font-bold font-mono ${highPriorityCount > 0 ? "text-red-600" : "text-slate-400"}`}>
              {highPriorityCount > 0 ? "Perlu Respon" : "Aman / Nihil"}
            </span>
          </div>
        </div>

        {/* Card 3: Antrian Follow-Up */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleCardClick("FOLLOWUP")}
          onKeyDown={(e) => e.key === "Enter" && handleCardClick("FOLLOWUP")}
          className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
            selectedFilter === "FOLLOWUP"
              ? "bg-amber-50/90 border-amber-400 shadow-xs ring-2 ring-amber-500/20"
              : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
          }`}
        >
          {/* Header Row: Icon + Badges */}
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                selectedFilter === "FOLLOWUP" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-600"
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>

            {selectedFilter === "FOLLOWUP" && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md">
                Aktif
              </span>
            )}
          </div>

          {/* Metric Value & Label */}
          <div className="min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-amber-600 leading-tight">
                {followUpCount}
              </span>
              <span className="text-2xs text-slate-400 font-mono">Leads</span>
            </div>
            <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
              Antrian Follow-Up
            </div>
          </div>

          {/* Footer Row */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-2xs">
            <span className="text-slate-500 font-medium">Jadwal CS:</span>
            <span className={`font-bold font-mono ${followUpCount > 0 ? "text-amber-700" : "text-slate-400"}`}>
              {followUpCount > 0 ? `${followUpCount} Kontak` : "Selesai"}
            </span>
          </div>
        </div>

        {/* Card 4: Konversi DP Sah */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleCardClick("BOOKING")}
          onKeyDown={(e) => e.key === "Enter" && handleCardClick("BOOKING")}
          className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
            selectedFilter === "BOOKING"
              ? "bg-emerald-50/90 border-emerald-400 shadow-xs ring-2 ring-emerald-500/20"
              : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
          }`}
        >
          {/* Header Row: Icon + Badges */}
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                selectedFilter === "BOOKING" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-600"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] font-extrabold text-emerald-700 font-mono bg-emerald-100/90 px-1.5 py-0.5 rounded-md">
                {conversionRate}%
              </span>
              {selectedFilter === "BOOKING" && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                  Aktif
                </span>
              )}
            </div>
          </div>

          {/* Metric Value & Label */}
          <div className="min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-emerald-600 leading-tight">
                {bookingCount}
              </span>
              <span className="text-2xs text-slate-400 font-mono">Booking</span>
            </div>
            <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
              Konversi DP Sah
            </div>
          </div>

          {/* Footer Row */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-2xs">
            <span className="text-slate-500 font-medium">Total DP:</span>
            <span className="font-extrabold text-emerald-700 font-mono">
              Rp {totalRevenue.toLocaleString("id-ID")}
            </span>
          </div>
        </div>
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
                {selectedFilter === "BOOKING" && "📌 Konversi DP Terverifikasi"}
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
          {/* Log Order Sync Status Banner */}
          {logSyncMsg && (
            <div className="p-2.5 bg-emerald-50 border-b border-emerald-200 text-2xs text-emerald-800 font-medium flex items-center gap-1.5 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600 shrink-0" />
              <span>{logSyncMsg}</span>
            </div>
          )}

          {/* Search Bar & Sync Log Order Button */}
          <div className="p-2.5 border-b border-slate-100 bg-white">
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
                onClick={handleSyncLogOrder}
                disabled={isSyncingLogOrder}
                title="Tarik & sinkronkan data DP dari Log Order manual Google Sheets"
                className="px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300/80 text-emerald-700 rounded-xl transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer disabled:opacity-50 text-2xs font-bold shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLogOrder ? "animate-spin text-emerald-600" : ""}`} />
                <span className="hidden sm:inline">Sinkron Log DP</span>
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
                    className={`w-full text-left p-2.5 transition-all flex items-start gap-2.5 cursor-pointer relative ${
                      isConverted
                        ? isActive
                          ? "bg-emerald-50/90 border-l-3 border-emerald-600 ring-1 ring-emerald-400/20"
                          : "bg-emerald-50/20 hover:bg-emerald-50/60 border-l-3 border-emerald-500"
                        : isActive
                        ? "bg-indigo-50/80 border-l-3 border-indigo-600"
                        : "hover:bg-slate-100/80 border-l-3 border-transparent"
                    }`}
                  >
                    {/* Customer Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${
                        isConverted ? "from-emerald-500 to-teal-600" : avatarColor(displayName)
                      } flex items-center justify-center text-white font-semibold text-xs shrink-0 mt-0.5 shadow-2xs relative`}
                    >
                      {initials}
                      {/* Pinned conversion badge on avatar */}
                      {isConverted && (
                        <span className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-2xs border border-emerald-200">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                        </span>
                      )}
                    </div>

                    {/* Customer Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-semibold text-slate-800 text-xs truncate">
                          {displayName}
                        </span>
                        {/* Temperature or Converted Badge */}
                        {isConverted ? (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center gap-1 shrink-0">
                            <Pin className="w-2 h-2 text-emerald-600" />
                            <span>DP TERVERIFIKASI</span>
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full border shrink-0 ${tc2.bg} ${tc2.text} ${tc2.border}`}
                          >
                            {tc2.label}
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-400 mb-0.5 font-mono flex items-center gap-1.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />
                          {lead.phoneNumber.startsWith("62800") ? "Log Order Kasir" : lead.phoneNumber}
                        </span>
                        {lead.source === "LOG_ORDER" && (
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-sans border border-slate-200">
                            Log Studio
                          </span>
                        )}
                      </div>

                      {lastMsg && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                          &ldquo;{lastMsg.messageText}&rdquo;
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {isConverted && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60 flex items-center gap-0.5">
                            <span>✓</span>
                            <span>{lead.revenue ? `DP Rp ${lead.revenue.toLocaleString("id-ID")}` : "DP Sah"}</span>
                          </span>
                        )}

                        {isUrgent && lead.temperature !== "COLD" && !isConverted && (
                          <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-bold animate-pulse">
                            Urgent
                          </span>
                        )}

                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded">
                          {lead.interactions.length} pesan
                        </span>

                        {lastMsg && (
                          <span className="text-[10px] text-slate-400 ml-auto shrink-0 font-medium">
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
              {/* ── Chat Header (Sleek & Proportional) ── */}
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  {/* Back to list button on mobile */}
                  <button
                    onClick={() => setMobileTab("list")}
                    className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Kembali ke daftar pesan"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div
                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${
                      isLeadConverted ? "from-emerald-500 to-teal-600" : avatarColor(activeLead.name || "?")
                    } flex items-center justify-center text-white font-semibold text-xs shadow-2xs`}
                  >
                    {(activeLead.name || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                        {activeLead.name || "Customer Tanpa Nama"}
                      </span>
                      {isLeadConverted ? (
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200/90 px-2 py-0.2 rounded-full font-semibold flex items-center gap-1">
                          <CheckCheck className="w-3 h-3 text-emerald-600" />
                          <span>KONVERSI RESMI (DP)</span>
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full border ${tc.bg} ${tc.text} ${tc.border}`}
                        >
                          {tc.label}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" />
                        {activeLead.phoneNumber.startsWith("62800") ? "Log Order Kasir Studio" : activeLead.phoneNumber}
                      </span>
                      {activeLead.source === "LOG_ORDER" && (
                        <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200/60 px-1.5 py-0.2 rounded font-sans font-medium">
                          Buku Log Studio
                        </span>
                      )}
                      <span className="text-slate-300">·</span>
                      <span>Owner: {activeLead.leadOwner || "Admin CS"}</span>
                      <span className="text-slate-300">·</span>
                      <span>Skor: {activeLead.leadScore ?? 0}/100</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setBookingPaymentType("DP");
                      setBookingAmount(150000);
                      setShowMarkBookingModal(true);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-2xs cursor-pointer ${
                      isLeadConverted
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                        : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200"
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      {isLeadConverted ? "Edit Pembayaran DP" : "Konfirmasi DP Masuk"}
                    </span>
                    <span className="sm:hidden">{isLeadConverted ? "Edit DP" : "Input DP"}</span>
                  </button>

                  <a
                    href={`https://wa.me/${activeLead.phoneNumber.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-all shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Buka Chat WA</span>
                    <span className="sm:hidden">WA</span>
                  </a>
                </div>
              </div>

              {/* ══════════ STICKY PIN: BUKTI TRANSAKSI PEMBAYARAN DP TERVERIFIKASI (COMPACT & SANTAI) ══════════ */}
              {isLeadConverted && (
                <div className="mx-3 sm:mx-4 mt-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl px-3 py-2 shadow-2xs flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Pin className="w-3 h-3 fill-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-1.5 py-0.2 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                          Bukti DP Sah
                        </span>
                        {activeLead.revenue && activeLead.revenue > 0 ? (
                          <span className="text-xs font-bold text-emerald-800">
                            Rp {activeLead.revenue.toLocaleString("id-ID")}
                          </span>
                        ) : null}
                        <span className="text-slate-300 hidden sm:inline">·</span>
                        <span className="text-[11px] text-slate-700 font-medium truncate max-w-xs sm:max-w-md">
                          {activeLead.bookingNotes || "Bukti transfer DP telah diverifikasi sah"}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        Jadwal terkunci · Follow up nonaktif · Verifikasi DP: {activeLead.closingAdmin || activeLead.leadOwner || "Admin"}
                      </p>
                    </div>
                  </div>

                  {/* Tombol Loncat ke Chat Bukti */}
                  {conversionInteraction && (
                    <button
                      onClick={scrollToConversionMessage}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium transition-all shadow-2xs shrink-0 cursor-pointer"
                      title="Lihat pesan struk transfer di dalam riwayat chat"
                    >
                      <ArrowDownCircle className="w-3 h-3 text-emerald-600" />
                      <span className="hidden sm:inline">Lihat di Chat</span>
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
                      className={`space-y-1.5 rounded-xl p-1.5 transition-all ${
                        isThisConversionTrigger
                          ? "bg-emerald-50/40 border border-emerald-200/80"
                          : ""
                      }`}
                    >
                      {/* Pinned Conversion Badge inside the message stream */}
                      {isThisConversionTrigger && (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 mb-0.5 pl-1">
                          <Pin className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                          <span>📌 Bukti Transaksi Konversi (DP / Pelunasan)</span>
                        </div>
                      )}

                      {/* 1. Customer Inbound Bubble (Left-aligned) */}
                      <div className="flex flex-col items-start max-w-[85%] sm:max-w-[75%]">
                        <span className="text-[10px] text-slate-400 mb-0.5 pl-1 flex items-center gap-1">
                          <span>{activeLead.name || "Customer"}</span>
                          <span>·</span>
                          <span>{formatTime(msg.createdAt)}</span>
                          {msg.isHighPriority && activeLead.temperature !== "COLD" && (
                            <span className="ml-1 text-red-500 font-bold flex items-center gap-0.5">
                              <Flame className="w-2.5 h-2.5 inline" /> URGENT
                            </span>
                          )}
                        </span>
                        {(() => {
                          const photoMatch =
                            msg.messageText?.match(/\[Foto Bukti Transfer:\s*(https?:\/\/[^\s\]]+)\]/i) ||
                            msg.messageText?.match(/(https?:\/\/[^\s]+?\.(?:png|jpe?g|webp|gif))/i);
                          const mediaUrl = photoMatch ? photoMatch[1] : null;
                          const cleanText = mediaUrl
                            ? msg.messageText
                                .replace(/\[Foto Bukti Transfer:\s*https?:\/\/[^\s\]]+\]/i, "")
                                .replace(mediaUrl, "")
                                .trim()
                            : msg.messageText;

                          return (
                            <div
                              className={`shadow-2xs rounded-sm rounded-tr-xl rounded-br-xl rounded-bl-xl px-3.5 py-2 text-xs leading-relaxed ${
                                isThisConversionTrigger
                                  ? "bg-white border border-emerald-300 text-slate-900 font-medium"
                                  : "bg-white border border-slate-200/90 text-slate-800"
                              }`}
                            >
                              {cleanText ? cleanText : (mediaUrl ? "Mengirim foto bukti transfer:" : msg.messageText)}
                              {mediaUrl && (
                                <div className="mt-2 pt-2 border-t border-slate-100">
                                  <div
                                    onClick={() => setSelectedImageModalUrl(mediaUrl)}
                                    className="group relative rounded-lg overflow-hidden border border-slate-200 hover:border-emerald-400 bg-slate-50 transition-all cursor-pointer inline-block max-w-xs shadow-2xs"
                                    title="Klik untuk memperbesar bukti transfer"
                                  >
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/80 text-white text-[10px] font-medium backdrop-blur-xs">
                                      <ImageIcon className="w-3 h-3 text-emerald-400" />
                                      <span>SS Bukti Transfer</span>
                                      <span className="text-slate-300 ml-auto text-2xs group-hover:text-emerald-300">
                                        🔍 Perbesar
                                      </span>
                                    </div>
                                    <img
                                      src={mediaUrl}
                                      alt="Bukti Transfer"
                                      className="max-h-44 w-auto object-cover group-hover:scale-102 transition-transform duration-200"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = "none";
                                      }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        {msg.ruleSignals && (
                          <div className="flex gap-1 flex-wrap mt-1 pl-1">
                            {msg.ruleSignals.split(",").map((sig, i) => (
                              <span
                                key={i}
                                className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                                  isThisConversionTrigger
                                    ? "bg-emerald-100 text-emerald-800 font-medium"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {sig.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 2. AI Intelligence Box (Attached under customer message) */}
                      <div className="flex flex-col items-start max-w-[95%] sm:max-w-[85%] pl-1">
                        <div
                          className={`rounded-xl px-3 py-2.5 text-xs leading-relaxed space-y-2 border w-full shadow-2xs ${
                            isThisConversionTrigger
                              ? "bg-emerald-50/70 border-emerald-200"
                              : "bg-indigo-50/50 border-indigo-100"
                          }`}
                        >
                          {/* Intent & Scores Bar */}
                          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-indigo-100/60 pb-1.5">
                            <div className="flex items-center gap-1.5">
                              <Sparkles
                                className={`w-3 h-3 ${
                                  isThisConversionTrigger ? "text-emerald-600" : "text-indigo-600"
                                }`}
                              />
                              <span
                                className={`font-semibold text-[11px] ${
                                  isThisConversionTrigger ? "text-emerald-900" : "text-indigo-900"
                                }`}
                              >
                                {isThisConversionTrigger ? "Verifikasi Vision AI" : "Analisis AI Gemini"}
                              </span>
                              {msg.intentCategory && (
                                <span
                                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-medium ${
                                    isThisConversionTrigger
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-indigo-100 text-indigo-700"
                                  }`}
                                >
                                  {msg.intentCategory}
                                </span>
                              )}
                              {msg.sentiment && (
                                <span className="bg-white text-slate-600 border border-slate-200 px-1.5 py-0.2 rounded-full text-[10px]">
                                  {msg.sentiment}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">
                              Skor {msg.leadScore}/100 · Urgensi {msg.urgencyScore}/5
                            </span>
                          </div>

                          {/* Summary */}
                          {msg.summary && (
                            <p className="text-slate-700 text-[11px] leading-relaxed">
                              <span className="font-semibold text-slate-800">Kebutuhan: </span>
                              {msg.summary}
                            </p>
                          )}

                          {/* Suggested Action */}
                          {msg.suggestedAction && (
                            <div className="flex items-center gap-1.5 bg-white/90 border border-indigo-100/80 rounded-lg px-2.5 py-1.5 text-[11px]">
                              <ChevronRight className="w-3 h-3 text-indigo-600 shrink-0" />
                              <span className="font-semibold text-indigo-800 shrink-0">Tindakan CS: </span>
                              <span className="text-slate-700 truncate">{msg.suggestedAction}</span>
                            </div>
                          )}

                          {/* Recommended Reply (Human-in-the-loop preview) */}
                          {msg.recommendedReply && (
                            <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 space-y-1 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-amber-700 text-[10px] flex items-center gap-1">
                                  💬 Draf Balasan CS (Ramah &amp; Santai)
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleReanalyze(msg.id)}
                                    disabled={reanalyzingId === msg.id}
                                    className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-medium transition-colors cursor-pointer disabled:opacity-50"
                                    title="Buat ulang draf dengan gaya human AI terbaru"
                                  >
                                    <RefreshCw className={`w-2.5 h-2.5 ${reanalyzingId === msg.id ? "animate-spin" : ""}`} />
                                    <span>{reanalyzingId === msg.id ? "..." : "Regenerate"}</span>
                                  </button>
                                  <button
                                    onClick={() => copyToClipboard(msg.recommendedReply!, msg.id)}
                                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
                                  >
                                    {copiedId === msg.id ? (
                                      <>
                                        <CheckCheck className="w-3 h-3 text-emerald-600" />
                                        <span className="text-emerald-600">Tersalin!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-2.5 h-2.5" />
                                        Copy
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

              {/* ── Fixed Bottom Action Bar: Latest AI Draft (Compact & Santai) ── */}
              {latestWithReply && (
                <div className="border-t border-slate-200 px-4 py-2.5 bg-white shrink-0 shadow-xs">
                  <div className="text-[11px] font-medium text-slate-600 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Saran Balasan AI (Siap Review &amp; Kirim)
                    </span>
                    <button
                      onClick={() => handleReanalyze(latestWithReply.id)}
                      disabled={reanalyzingId === latestWithReply.id}
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium transition-colors cursor-pointer disabled:opacity-50"
                      title="Perbarui draf dengan AI gaya ramah humanis terbaru"
                    >
                      <RefreshCw className={`w-3 h-3 ${reanalyzingId === latestWithReply.id ? "animate-spin" : ""}`} />
                      <span>{reanalyzingId === latestWithReply.id ? "Menganalisis..." : "⚡ Buat Ulang"}</span>
                    </button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 leading-relaxed italic max-h-20 overflow-y-auto">
                      &ldquo;{latestWithReply.recommendedReply}&rdquo;
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => copyToClipboard(latestWithReply.recommendedReply!, "bottom-bar")}
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-all cursor-pointer shadow-2xs"
                      >
                        {copiedId === "bottom-bar" ? (
                          <>
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span className="hidden sm:inline">Copy</span>
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
                        className="inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Kirim WA</span>
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
                  <h3 className="text-sm font-bold">Konfirmasi Pembayaran DP (Booking)</h3>
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
              {/* Informational Alert Box */}
              <div className="p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-900 flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Aturan Konversi Foxe Studio:</strong> Leads terhitung sebagai <em>Konversi Resmi</em> secara khusus dari pembayaran <strong>DP (Down Payment)</strong>.
                </span>
              </div>

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
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer text-left flex flex-col gap-0.5 ${
                      bookingPaymentType === "DP"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>DP (Uang Muka)</span>
                    <span className="text-[9px] text-emerald-600 font-semibold uppercase">✓ Dihitung Konversi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBookingPaymentType("Pelunasan");
                      setBookingAmount(350000);
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer text-left flex flex-col gap-0.5 ${
                      bookingPaymentType === "Pelunasan"
                        ? "bg-slate-100 border-slate-400 text-slate-800 ring-2 ring-slate-400/20"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>Pelunasan Penuh</span>
                    <span className="text-[9px] text-slate-400 font-normal">Sisa Pembayaran Sesi</span>
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
                      <span>Simpan &amp; Konfirmasi DP Sah</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: VIEW FULL IMAGE SCREENSHOT ══════════ */}
      {selectedImageModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedImageModalUrl(null)}
        >
          <div
            className="relative max-w-2xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-700/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white text-xs">
              <span className="font-semibold flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                Bukti Transfer / Struk Pembayaran DP
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={selectedImageModalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-300 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                  title="Buka di tab baru"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setSelectedImageModalUrl(null)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-3 overflow-auto flex items-center justify-center bg-slate-100">
              <img
                src={selectedImageModalUrl}
                alt="Bukti Transfer Penuh"
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: DAILY REPORT BREAKDOWN ══════════ */}
      {dailyReportModalDay !== null && (
        <DailyReportModal
          day={dailyReportModalDay}
          records={(logOrderRaw as LogOrderEntry[]).filter((r) => r.day === dailyReportModalDay)}
          leads={leadsState}
          isOpen={dailyReportModalDay !== null}
          inboundChatCount={
            dailyInboundChats[dailyReportModalDay] !== undefined
              ? dailyInboundChats[dailyReportModalDay]
              : getCrmLeadsForDay(dailyReportModalDay).length
          }
          isAutoInbound={dailyInboundChats[dailyReportModalDay] === undefined}
          onOpenInputChat={(d) => {
            setInputChatDay(d);
            setInputChatVal(
              dailyInboundChats[d] !== undefined
                ? dailyInboundChats[d]
                : getCrmLeadsForDay(d).length
            );
            setShowInputChatModal(true);
          }}
          onClose={() => setDailyReportModalDay(null)}
          onSelectLeadForChat={(leadId) => {
            setActiveId(leadId);
            setMobileTab("chat");
          }}
          onApplyDayFilter={(day) => {
            setSelectedCalendarDay(day);
          }}
        />
      )}

      {/* ══════════ MODAL: INPUT JUMLAH CHAT MASUK HARIAN ══════════ */}
      {showInputChatModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Input Chat Masuk Harian</h3>
                  <p className="text-2xs text-slate-300">
                    Tanggal {inputChatDay} September 2026
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInputChatModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDailyInboundChats} className="p-5 space-y-4">
              <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Sistem Otomatis CRM Aktif</span>
                </div>
                CRM secara otomatis menghitung <strong>{getCrmLeadsForDay(inputChatDay).length} chat masuk</strong> dari interaksi pesan WhatsApp. Anda hanya perlu mengisi manual bila ada leads tambahan dari channel offline atau direct call.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Jumlah Chat Masuk (Inbound Leads):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={inputChatVal || ""}
                    onChange={(e) => setInputChatVal(Number(e.target.value) || 0)}
                    placeholder={`Otomatis CRM: ${getCrmLeadsForDay(inputChatDay).length}`}
                    className="w-full px-3.5 py-2.5 text-lg font-extrabold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white pr-14"
                    autoFocus
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                    Chat
                  </span>
                </div>
              </div>

              {inputChatVal > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between items-center font-bold text-emerald-900">
                    <span className="flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Estimasi Rate Konversi:</span>
                    </span>
                    <span className="text-sm font-extrabold text-emerald-700 font-mono">
                      {((bookingCount / inputChatVal) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-2xs text-emerald-700 leading-relaxed">
                    {bookingCount} transaksi DP sah berhasil closing dari total {inputChatVal} chat masuk.
                  </div>
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2 border-t border-slate-100">
                {dailyInboundChats[inputChatDay] !== undefined && (
                  <button
                    type="button"
                    onClick={() => handleResetDailyInboundChats(inputChatDay)}
                    className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Gunakan Hitungan Otomatis CRM ({getCrmLeadsForDay(inputChatDay).length} Chat)</span>
                  </button>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowInputChatModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Simpan Manual</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
