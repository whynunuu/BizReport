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
  UserPlus,
  Info,
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
  lastBookingDate?: Date | string | null;
  createdAt?: Date | string;
  updatedAt: Date | string;
  interactions: Interaction[];
}

interface Props {
  leads: Lead[];
}

type MetricFilter = "ALL" | "NEW_CUSTOMERS" | "URGENT" | "FOLLOWUP" | "BOOKING";

// Helper waktu WIB (Asia/Jakarta)
export function getJakartaDate(dateInput: Date | string | null | undefined) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(d);
  return {
    day: Number(parts.find((p) => p.type === "day")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
    year: Number(parts.find((p) => p.type === "year")?.value),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function tempConfig(temp: string | null) {
  switch (temp) {
    case "HOT":
      return { label: "🔥 HOT", bg: "bg-zinc-800", text: "text-zinc-100", border: "border-zinc-700", dot: "bg-red-400" };
    case "WARM":
      return { label: "🟡 WARM", bg: "bg-zinc-800", text: "text-zinc-300", border: "border-zinc-700", dot: "bg-amber-400" };
    default:
      return { label: "❄️ COLD", bg: "bg-zinc-800/80", text: "text-zinc-400", border: "border-zinc-800", dot: "bg-zinc-500" };
  }
}

function avatarColor(name: string) {
  const colors = [
    "from-zinc-700 to-zinc-800",
    "from-zinc-800 to-zinc-900",
    "from-neutral-700 to-neutral-800",
    "from-zinc-600 to-zinc-800",
    "from-stone-700 to-stone-800",
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
  const hasRevenue = Boolean(lead.revenue != null && lead.revenue > 0);
  const isBooking = lead.status === "BOOKING" || lead.hasBooking || lead.source === "LOG_ORDER" || hasRevenue;
  if (!isBooking) return false;

  // Jika lead berasal dari LOG_ORDER, dipastikan DP
  if (lead.source === "LOG_ORDER" || lead.hasBooking || lead.status === "BOOKING") {
    return true;
  }

  // Wajib ada catatan DP atau sinyal DP sah dari interaksi / OCR struk
  const hasDPInNotes = Boolean(
    lead.bookingNotes && /\b(dp|down payment|uang muka|transfer|bayar|log order|raw files|ocr|terverifikasi)\b/i.test(lead.bookingNotes)
  );
  const hasDPInInteractions = Boolean(
    lead.interactions?.some((i) =>
      /\b(dp|down payment|uang muka|payment|receipt|log_order_dp|raw_files_job)\b/i.test(i.ruleSignals || "") ||
      /\[konfirmasi pembayaran\]/i.test(i.messageText || "") ||
      /\bdp via\b/i.test(i.messageText || "")
    )
  );

  return hasDPInNotes || hasDPInInteractions || hasRevenue;
}
export const isLeadVerifiedBooking = isLeadVerifiedDPBooking;

// Helper: Memeriksa apakah transaksi DP lead sah terjadi pada hari aktif tertentu (WIB)
// Menjamin sinkronisasi 100% antara Kalender Bulanan, Modal Harian, dan Kartu Metrik CRM
export function isLeadDPBookingOnDay(lead: Lead | null | undefined, targetDay: number | null): boolean {
  if (!lead) return false;
  if (!isLeadVerifiedDPBooking(lead)) return false;
  if (targetDay === null) return true; // Mode seluruh bulan: semua transaksi DP sah terverifikasi

  // 1. Synthetic Lead dari Log Order (format: 62800 + [Day 2 digit] + [Idx 3 digit])
  if (lead.phoneNumber.startsWith("62800")) {
    const dayPrefix = `62800${String(targetDay).padStart(2, "0")}`;
    return lead.phoneNumber.startsWith(dayPrefix);
  }

  // 2. Booking Notes spesifik mencatat "Log Order Day [targetDay]"
  if (lead.bookingNotes && lead.bookingNotes.includes(`Log Order Day ${targetDay}`)) {
    return true;
  }

  // 3. Pencocokan dengan catatan Log Order pada targetDay
  const dayRecords = (logOrderRaw as LogOrderEntry[]).filter((r) => r.day === targetDay);
  const lNameClean = (lead.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const isMatchedClientInLogOrder = dayRecords.some((r) => {
    const cClean = r.client.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (lNameClean === cClean) return true;
    if (cClean === "anin" && lNameClean.includes("aninditya")) return true;
    if (cClean === "tiara" && lNameClean.includes("tiararamadhani")) return true;
    if (cClean === "sabna" && lNameClean.includes("sabna")) return true;
    if (cClean === "nana tri" && lNameClean.includes("nana")) return true;
    if (cClean === "sembilan e" && (lNameClean.includes("sembilan") || lead.phoneNumber === "6282220421960")) return true;
    if ((cClean === "bela amarwati" || cClean === "bela") && (lNameClean.includes("bela") || lead.phoneNumber === "628152568077")) return true;
    if ((cClean === "rio furqon" || cClean === "rio") && (lNameClean.includes("rio") || lead.phoneNumber === "6281215826845")) return true;
    return false;
  });
  if (isMatchedClientInLogOrder) return true;

  // 4. Interaksi transfer DP WhatsApp langsung (non-log-order) yang terjadi pada targetDay
  const hasDirectWAPaymentOnDay = lead.interactions?.some((i) => {
    if (i.ruleSignals?.includes("LOG_ORDER_DP")) return false;

    const isDP =
      i.ruleSignals?.includes("PAYMENT_RECEIPT_VERIFIED") ||
      /\b(dp|down payment|uang muka)\b/i.test(i.ruleSignals || "") ||
      /\[konfirmasi pembayaran\]\s*dp/i.test(i.messageText || "") ||
      /\bdp via\b/i.test(i.messageText || "");

    if (!isDP) return false;
    const jk = getJakartaDate(i.createdAt);
    return jk && jk.day === targetDay && jk.month === 9 && jk.year === 2026;
  });

  if (hasDirectWAPaymentOnDay) return true;

  // 5. Fallback pencocokan tanggal (lastBookingDate / updatedAt / createdAt) untuk lead booking aktif pada targetDay
  if (lead.lastBookingDate) {
    const d = new Date(lead.lastBookingDate);
    if (!isNaN(d.getTime()) && d.getDate() === targetDay) return true;
  }
  if (lead.updatedAt) {
    const d = new Date(lead.updatedAt);
    if (!isNaN(d.getTime()) && d.getDate() === targetDay) return true;
  }
  if (lead.createdAt) {
    const d = new Date(lead.createdAt);
    if (!isNaN(d.getTime()) && d.getDate() === targetDay) return true;
  }

  return false;
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

  // Helper: Mengecek apakah lead merupakan pelanggan BARU (murni kontak pertama kali) pada tanggal tersebut (WIB)
  const isLeadBrandNewCustomerOnDay = (lead: Lead, targetDay: number | null): boolean => {
    if (!lead) return false;

    // Pelanggan dari nomor log order manual (62800...)
    if (lead.phoneNumber.startsWith("62800")) {
      if (targetDay !== null) {
        return lead.phoneNumber.includes(`62800${String(targetDay).padStart(2, "0")}`);
      }
      return true;
    }

    // Urutkan interaksi kronologis untuk mendapatkan tanggal PERTAMA KALI chat
    const sorted = [...lead.interactions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const firstDateRaw = sorted[0]?.createdAt || lead.createdAt;
    const jk = getJakartaDate(firstDateRaw);
    if (!jk) return false;

    if (targetDay !== null) {
      return jk.day === targetDay && jk.month === 9 && jk.year === 2026;
    }
    // Bulan penuh (September 2026)
    return jk.month === 9 && jk.year === 2026;
  };

  // Helper untuk memfilter seluruh leads CRM yang aktif pada tanggal tertentu (WIB)
  const getActiveLeadsForDay = (targetDay: number) => {
    return leadsState.filter((l) => {
      // 1. WhatsApp leads: ada interaksi pada tanggal ini (WIB) ATAU lead ini adalah transaksi DP pada tanggal ini
      if (!l.phoneNumber.startsWith("62800")) {
        if (isLeadDPBookingOnDay(l, targetDay)) return true;
        return l.interactions.some((i) => {
          const jk = getJakartaDate(i.createdAt);
          return jk && jk.day === targetDay && jk.month === 9 && jk.year === 2026;
        });
      }

      // 2. Log Order manual synthetic leads (62800...): HANYA jika nomornya persis untuk hari ini!
      const dayPrefix = `62800${String(targetDay).padStart(2, "0")}`;
      return l.phoneNumber.startsWith(dayPrefix);
    });
  };

  // Saring scope dasar bila kalender tanggal tertentu dipilih
  const baseLeadsScope = useMemo(() => {
    if (selectedCalendarDay === null) return leadsState;
    return getActiveLeadsForDay(selectedCalendarDay);
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

  // Konversi DP Sah: HANYA dihitung dari kombinasi live database leads & static Log Order
  const dpConvertedSummary = useMemo(() => {
    const recordsMap = new Map<string, { nominal: number }>();
    
    // 1. Ambil dari static logOrderRaw
    (logOrderRaw as LogOrderEntry[]).forEach((rec) => {
      if (selectedCalendarDay !== null && rec.day !== selectedCalendarDay) return;
      const key = `static_${rec.day}_${rec.client.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      recordsMap.set(key, { nominal: rec.nominal || 100000 });
    });

    // 2. Ambil dari live DB leadsState
    leadsState.forEach((l) => {
      const isBooking = isLeadVerifiedDPBooking(l);
      if (!isBooking) return;

      if (selectedCalendarDay !== null) {
        if (!isLeadDPBookingOnDay(l, selectedCalendarDay)) return;
      }

      const lClean = (l.name || l.phoneNumber).toLowerCase().replace(/[^a-z0-9]/g, "");
      const key = `db_${lClean}`;
      
      if (!recordsMap.has(key)) {
        recordsMap.set(key, { nominal: (l.revenue && l.revenue > 0) ? l.revenue : 100000 });
      }
    });

    let count = 0;
    let rev = 0;
    recordsMap.forEach((v) => {
      count += 1;
      rev += v.nominal;
    });

    return { count, totalRevenue: rev };
  }, [leadsState, selectedCalendarDay]);

  const dpConvertedLeads = useMemo(() => {
    if (selectedCalendarDay === null) {
      return leadsState.filter((l) => isLeadVerifiedDPBooking(l));
    }
    return leadsState.filter((l) => isLeadDPBookingOnDay(l, selectedCalendarDay));
  }, [leadsState, selectedCalendarDay]);

  const bookingCount = dpConvertedSummary.count > 0 ? dpConvertedSummary.count : dpConvertedLeads.length;
  const totalRevenue = dpConvertedSummary.totalRevenue > 0 ? dpConvertedSummary.totalRevenue : dpConvertedLeads.reduce((sum, l) => sum + (l.revenue || 100000), 0);

  // Status Otomatis CRM vs Manual Override untuk hari aktif (MURNI Leads New Customers)
  const activeDayForChat = selectedCalendarDay ?? 24;
  const crmAutoNewLeadsCountForDay = (selectedCalendarDay !== null ? baseLeadsScope : leadsState).filter((l) =>
    isLeadBrandNewCustomerOnDay(l, selectedCalendarDay)
  ).length;

  const manualCountForActiveDay = selectedCalendarDay !== null ? dailyInboundChats[selectedCalendarDay] : undefined;
  const isAutoChatCount = selectedCalendarDay !== null
    ? manualCountForActiveDay === undefined
    : Object.keys(dailyInboundChats).length === 0;

  // Total Leads New Customers & Closing Rate calculation (100% otomatis dari data CRM jika tidak ada override manual)
  const displayChatCount = useMemo(() => {
    if (selectedCalendarDay !== null) {
      return manualCountForActiveDay !== undefined ? manualCountForActiveDay : crmAutoNewLeadsCountForDay;
    }
    // Mode Semua Hari (Full Bulan):
    if (Object.keys(dailyInboundChats).length === 0) {
      return leadsState.filter((l) => isLeadBrandNewCustomerOnDay(l, null)).length;
    }
    // Jika ada hari yang dioverride manual, jumlahkan per hari:
    let total = 0;
    for (let d = 1; d <= 30; d++) {
      if (dailyInboundChats[d] !== undefined) {
        total += dailyInboundChats[d];
      } else {
        total += getActiveLeadsForDay(d).filter((l) => isLeadBrandNewCustomerOnDay(l, d)).length;
      }
    }
    return total > 0 ? total : leadsState.length;
  }, [selectedCalendarDay, manualCountForActiveDay, crmAutoNewLeadsCountForDay, dailyInboundChats, leadsState]);

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

      if (selectedFilter === "NEW_CUSTOMERS") {
        matchMetric = isLeadBrandNewCustomerOnDay(l, selectedCalendarDay);
      } else if (selectedFilter === "URGENT") {
        matchMetric = isUrgent;
      } else if (selectedFilter === "FOLLOWUP") {
        matchMetric = l.interactions.some((i) => i.needsFollowUp);
      } else if (selectedFilter === "BOOKING") {
        matchMetric = isLeadDPBookingOnDay(l, selectedCalendarDay);
      }

      return matchSearch && matchMetric;
    });
  }, [baseLeadsScope, selectedFilter, search, selectedCalendarDay]);

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
        leads={leadsState}
      />

      {/* ══════════ ACTIVE CALENDAR DAY FILTER BANNER ══════════ */}
      {selectedCalendarDay !== null && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-white rounded-xl text-xs gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-white shrink-0" />
            <span>
              Menampilkan filter tanggal: <strong>{selectedCalendarDay} September 2026</strong> ({filteredLeads.length} leads aktif)
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setDailyReportModalDay(selectedCalendarDay)}
              className="px-2.5 py-1 bg-white hover:bg-zinc-200 text-zinc-950 font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1 shadow-2xs"
            >
              📄 Buka Laporan Harian
            </button>
            <button
              onClick={() => setSelectedCalendarDay(null)}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 hover:text-white cursor-pointer transition-colors border border-zinc-700"
            >
              Tampilkan Semua Hari
            </button>
          </div>
        </div>
      )}

      {/* ══════════ METRIC CARDS (INTERACTIVE / FIT-IN 3-TIER HIERARCHY) ══════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Leads / Chat New Customers */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleCardClick("NEW_CUSTOMERS")}
          onKeyDown={(e) => e.key === "Enter" && handleCardClick("NEW_CUSTOMERS")}
          className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
            selectedFilter === "NEW_CUSTOMERS"
              ? "bg-zinc-800/90 border-zinc-500 shadow-md ring-1 ring-white/20"
              : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 shadow-2xs"
          }`}
        >
          {/* Header Row: Icon + Status Badges */}
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                selectedFilter === "NEW_CUSTOMERS"
                  ? "bg-white text-zinc-950 font-bold"
                  : "bg-zinc-800 text-zinc-300 border border-zinc-700"
              }`}
            >
              <UserPlus className="w-4 h-4" />
            </div>

            <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
              {isAutoChatCount ? (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded-md"
                  title="Dihitung otomatis dari demand kontak baru hari ini"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 animate-pulse" />
                  <span>Auto CRM</span>
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded-md"
                  title="Diatur manual oleh admin studio"
                >
                  <span>✏️ Manual</span>
                </span>
              )}
              {selectedFilter === "NEW_CUSTOMERS" && (
                <span className="text-[10px] font-bold text-zinc-950 bg-white px-1.5 py-0.5 rounded-md">
                  Aktif
                </span>
              )}
            </div>
          </div>

          {/* Metric Value & Label */}
          <div className="min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white leading-tight">
                {displayChatCount}
              </span>
              <span className="text-2xs text-zinc-400 font-mono">New Leads</span>
            </div>
            <div className="text-xs text-zinc-400 font-medium truncate mt-0.5">
              {selectedCalendarDay ? `New Customers (Tgl ${selectedCalendarDay})` : "Leads New Customers"}
            </div>
          </div>

          {/* Footer Row: Closing Rate & Edit Button */}
          <div className="mt-2.5 pt-2 border-t border-zinc-800 flex items-center justify-between text-2xs">
            <div className="flex items-center gap-1 text-zinc-400">
              <Target className="w-3 h-3 text-zinc-400 shrink-0" />
              <span className="font-medium">Closing:</span>
              <span className="font-bold text-zinc-200 font-mono bg-zinc-800 px-1.5 py-0.2 rounded border border-zinc-700">
                {conversionRate}%
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setInputChatDay(selectedCalendarDay ?? 24);
                setInputChatVal(displayChatCount);
                setShowInputChatModal(true);
              }}
              className="text-zinc-300 hover:text-white font-medium flex items-center gap-0.5 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors cursor-pointer"
              title="Input / Ubah jumlah leads baru atau reset ke Auto CRM"
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
              ? "bg-zinc-800/90 border-zinc-500 shadow-md ring-1 ring-white/20"
              : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 shadow-2xs"
          }`}
        >
          {/* Header Row: Icon + Badges */}
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                selectedFilter === "URGENT"
                  ? "bg-white text-zinc-950 font-bold"
                  : "bg-zinc-800 text-zinc-300 border border-zinc-700"
              }`}
            >
              <Flame className="w-4 h-4 text-zinc-100" />
            </div>

            {selectedFilter === "URGENT" && (
              <span className="text-[10px] font-bold text-zinc-950 bg-white px-1.5 py-0.5 rounded-md">
                Aktif
              </span>
            )}
          </div>

          {/* Metric Value & Label */}
          <div className="min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white leading-tight">
                {highPriorityCount}
              </span>
              <span className="text-2xs text-zinc-400 font-mono">Leads</span>
            </div>
            <div className="text-xs text-zinc-400 font-medium truncate mt-0.5">
              Prioritas Urgent
            </div>
          </div>

          {/* Footer Row */}
          <div className="mt-2.5 pt-2 border-t border-zinc-800 flex items-center justify-between text-2xs">
            <span className="text-zinc-400 font-medium">Status Antrian:</span>
            <span className={`font-bold font-mono ${highPriorityCount > 0 ? "text-zinc-100 bg-zinc-800 px-1.5 py-0.2 rounded border border-zinc-700" : "text-zinc-500"}`}>
              {highPriorityCount > 0 ? `${highPriorityCount} Perlu Respon` : "Aman / Nihil"}
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
              ? "bg-zinc-800/90 border-zinc-500 shadow-md ring-1 ring-white/20"
              : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 shadow-2xs"
          }`}
        >
          {/* Header Row: Icon + Badges */}
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                selectedFilter === "FOLLOWUP"
                  ? "bg-white text-zinc-950 font-bold"
                  : "bg-zinc-800 text-zinc-300 border border-zinc-700"
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>

            {selectedFilter === "FOLLOWUP" && (
              <span className="text-[10px] font-bold text-zinc-950 bg-white px-1.5 py-0.5 rounded-md">
                Aktif
              </span>
            )}
          </div>

          {/* Metric Value & Label */}
          <div className="min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white leading-tight">
                {followUpCount}
              </span>
              <span className="text-2xs text-zinc-400 font-mono">Leads</span>
            </div>
            <div className="text-xs text-zinc-400 font-medium truncate mt-0.5">
              Antrian Follow-Up
            </div>
          </div>

          {/* Footer Row */}
          <div className="mt-2.5 pt-2 border-t border-zinc-800 flex items-center justify-between text-2xs">
            <span className="text-zinc-400 font-medium">Jadwal CS:</span>
            <span className={`font-bold font-mono ${followUpCount > 0 ? "text-zinc-200 bg-zinc-800 px-1.5 py-0.2 rounded border border-zinc-700" : "text-zinc-500"}`}>
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
              ? "bg-zinc-800/90 border-zinc-500 shadow-md ring-1 ring-white/20"
              : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 shadow-2xs"
          }`}
        >
          {/* Header Row: Icon + Badges */}
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                selectedFilter === "BOOKING"
                  ? "bg-white text-zinc-950 font-bold"
                  : "bg-zinc-800 text-zinc-300 border border-zinc-700"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] font-extrabold text-zinc-200 font-mono bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded-md">
                {conversionRate}%
              </span>
              {selectedFilter === "BOOKING" && (
                <span className="text-[10px] font-bold text-zinc-950 bg-white px-1.5 py-0.5 rounded-md">
                  Aktif
                </span>
              )}
            </div>
          </div>

          {/* Metric Value & Label */}
          <div className="min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white leading-tight">
                {bookingCount}
              </span>
              <span className="text-2xs text-zinc-400 font-mono">Booking</span>
            </div>
            <div className="text-xs text-zinc-400 font-medium truncate mt-0.5">
              Konversi DP Sah
            </div>
          </div>

          {/* Footer Row */}
          <div className="mt-2.5 pt-2 border-t border-zinc-800 flex items-center justify-between text-2xs">
            <span className="text-zinc-400 font-medium">Total DP:</span>
            <span className="font-extrabold text-white font-mono">
              Rp {totalRevenue.toLocaleString("id-ID")}
            </span>
          </div>
        </div>
      </div>

      {/* ══════════ PANDUAN RINGKAS CARA MEMBACA METRIK KARTU ══════════ */}
      <div className="px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-2xs text-zinc-400 flex flex-col md:flex-row md:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-1.5 font-bold text-white shrink-0">
          <Info className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
          <span>Panduan Membaca Metrik:</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-relaxed">
          <span>
            <strong className="text-white font-semibold">1. Leads New Customers:</strong> Murni kontak baru hari ini untuk mengukur demand harian (chat lanjutan pelanggan lampau disaring ke antrian follow-up/urgent).
          </span>
          <span className="hidden lg:inline text-zinc-700">•</span>
          <span>
            <strong className="text-white font-semibold">2. Prioritas Urgent:</strong> Kontak butuh respon segera / panas.
          </span>
          <span className="hidden lg:inline text-slate-300">•</span>
          <span>
            <strong className="text-white font-semibold">3. Antrian Follow-Up:</strong> Prospek CS &amp; chat lanjutan pelanggan lama.
          </span>
          <span className="hidden lg:inline text-slate-300">•</span>
          <span>
            <strong className="text-white font-semibold">4. Konversi DP:</strong> Pelanggan sah membayar transfer DP pada tanggal tersebut (sinkron kalender bulanan &amp; tidak menduplikasi klien lama).
          </span>
          <span className="hidden lg:inline text-slate-300">•</span>
          <span>
            <strong className="text-white font-semibold">5. Closing Rate:</strong> (DP Sah ÷ Leads New Customers) × 100%.
          </span>
        </div>
      </div>

      {/* ══════════ ACTIVE FILTER BANNER (IF FILTERED) ══════════ */}
      {selectedFilter !== "ALL" && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-white rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-white" />
            <span>
              Menampilkan filter:{" "}
              <strong>
                {selectedFilter === "NEW_CUSTOMERS" && "✨ Leads New Customers (Murni Pelanggan Baru)"}
                {selectedFilter === "URGENT" && "🔥 Prioritas Tinggi / Urgent"}
                {selectedFilter === "FOLLOWUP" && "⏰ Antrian Follow-Up & Chat Lanjutan"}
                {selectedFilter === "BOOKING" && "📌 Konversi DP Terverifikasi"}
              </strong>{" "}
              ({filteredLeads.length} pelanggan ditemukan)
            </span>
          </div>
          <button
            onClick={() => setSelectedFilter("ALL")}
            className="inline-flex items-center gap-1 text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 rounded-lg transition-all cursor-pointer border border-zinc-700"
          >
            <X className="w-3 h-3" />
            Reset Filter
          </button>
        </div>
      )}

      {/* ══════════ CHAT ROOM SPLIT PANEL (RESPONSIVE) ══════════ */}
      <div className="flex flex-col md:flex-row h-[calc(100vh-16rem)] min-h-[550px] rounded-2xl border border-zinc-800 shadow-xs overflow-hidden bg-zinc-900">
        
        {/* ─── SIDEBAR: CUSTOMER DIRECTORY LIST ─── */}
        <div
          className={`w-full md:w-84 shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-950 ${
            mobileTab === "chat" ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Log Order Sync Status Banner */}
          {logSyncMsg && (
            <div className="p-2.5 bg-zinc-900 border-b border-zinc-800 text-2xs text-white font-medium flex items-center gap-1.5 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-300 shrink-0" />
              <span>{logSyncMsg}</span>
            </div>
          )}

          {/* Search Bar & Sync Log Order Button */}
          <div className="p-2.5 border-b border-zinc-800 bg-zinc-900">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama, nomor, pesan..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-zinc-700 bg-zinc-800 text-white focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500 placeholder-zinc-500 transition-all"
                />
              </div>
              <button
                type="button"
                onClick={handleSyncLogOrder}
                disabled={isSyncingLogOrder}
                title="Tarik & sinkronkan data DP dari Log Order manual Google Sheets"
                className="px-2.5 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-xl transition-all flex items-center justify-center gap-1 shrink-0 cursor-pointer disabled:opacity-50 text-2xs font-bold shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLogOrder ? "animate-spin text-white" : ""}`} />
                <span className="hidden sm:inline">Sinkron Log DP</span>
              </button>
            </div>
          </div>

          {/* Customer Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/80 bg-zinc-950">
            {filteredLeads.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs font-medium">Tidak ada pelanggan di kategori ini.</p>
                {selectedFilter !== "ALL" && (
                  <button
                    onClick={() => setSelectedFilter("ALL")}
                    className="text-xs text-zinc-300 hover:underline font-semibold cursor-pointer"
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
                          ? "bg-zinc-800 border-l-3 border-white text-white"
                          : "bg-zinc-900/90 hover:bg-zinc-800/80 border-l-3 border-zinc-400"
                        : isActive
                        ? "bg-zinc-800 border-l-3 border-white text-white"
                        : "hover:bg-zinc-900/90 border-l-3 border-transparent text-zinc-300"
                    }`}
                  >
                    {/* Customer Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full ${
                        isConverted ? "bg-white text-zinc-950 font-black" : "bg-zinc-800 text-white border border-zinc-700"
                      } flex items-center justify-center font-semibold text-xs shrink-0 mt-0.5 shadow-2xs relative`}
                    >
                      {initials}
                      {/* Pinned conversion badge on avatar */}
                      {isConverted && (
                        <span className="absolute -bottom-1 -right-1 bg-zinc-900 rounded-full p-0.5 shadow-2xs border border-zinc-700">
                          <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                        </span>
                      )}
                    </div>

                    {/* Customer Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-semibold text-zinc-100 text-xs truncate">
                          {displayName}
                        </span>
                        {/* Temperature or Converted Badge */}
                        {isConverted ? (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center gap-1 shrink-0">
                            <Pin className="w-2 h-2 text-white" />
                            <span>DP TERVERIFIKASI</span>
                          </span>
                        ) : (
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full border shrink-0 bg-zinc-800 text-zinc-300 border-zinc-700"
                          >
                            {tc2.label}
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-zinc-400 mb-0.5 font-mono flex items-center gap-1.5 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5 text-zinc-500" />
                          {lead.phoneNumber.startsWith("62800") ? "Log Order Kasir" : lead.phoneNumber}
                        </span>
                        {lead.source === "LOG_ORDER" && (
                          <span className="text-[9px] bg-zinc-800 text-zinc-300 px-1 py-0.2 rounded font-sans border border-zinc-700">
                            Log Studio
                          </span>
                        )}
                      </div>

                      {lastMsg && (
                        <p className="text-[11px] text-zinc-400 line-clamp-1 italic">
                          &ldquo;{lastMsg.messageText}&rdquo;
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {isConverted && (
                          <span className="text-[10px] font-semibold text-zinc-200 bg-zinc-800 px-1.5 py-0.2 rounded border border-zinc-700 flex items-center gap-1">
                            <span className="text-emerald-400">✓</span>
                            <span>{lead.revenue ? `DP Rp ${lead.revenue.toLocaleString("id-ID")}` : "DP Sah"}</span>
                          </span>
                        )}

                        {isUrgent && lead.temperature !== "COLD" && !isConverted && (
                          <span className="text-[10px] bg-zinc-800 text-zinc-100 border border-zinc-700 px-1.5 py-0.2 rounded font-bold animate-pulse">
                            Urgent
                          </span>
                        )}

                        <span className="text-[10px] bg-zinc-800/80 text-zinc-400 border border-zinc-800 px-1.5 py-0.2 rounded">
                          {lead.interactions.length} pesan
                        </span>

                        {lastMsg && (
                          <span className="text-[10px] text-zinc-500 ml-auto shrink-0 font-mono">
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
          className={`flex-1 flex flex-col min-w-0 bg-zinc-950 ${
            mobileTab === "list" ? "hidden md:flex" : "flex"
          }`}
        >
          {!activeLead ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8 space-y-3">
              <MessageSquare className="w-12 h-12 opacity-30 text-zinc-600" />
              <p className="text-sm font-medium text-zinc-300">Pilih salah satu pelanggan di sebelah kiri</p>
              <p className="text-xs text-zinc-500 text-center max-w-xs">
                Klik nama pelanggan untuk membuka ruang obrolan, membaca analisis Gemini AI, dan melihat draf balasan resmi.
              </p>
            </div>
          ) : (
            <>
              {/* ── Chat Header (Sleek & Proportional) ── */}
              <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900 shrink-0 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  {/* Back to list button on mobile */}
                  <button
                    onClick={() => setMobileTab("list")}
                    className="md:hidden p-1.5 -ml-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                    title="Kembali ke daftar pesan"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div
                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(activeLead.name || "?")} flex items-center justify-center text-white font-semibold text-xs border border-zinc-700 shadow-2xs`}
                  >
                    {(activeLead.name || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-white text-xs sm:text-sm">
                        {activeLead.name || "Customer Tanpa Nama"}
                      </span>
                      {isLeadConverted ? (
                        <span className="text-[10px] bg-zinc-800 text-zinc-200 border border-zinc-700 px-2 py-0.2 rounded-full font-semibold flex items-center gap-1">
                          <CheckCheck className="w-3 h-3 text-emerald-400" />
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
                    <div className="text-[11px] text-zinc-400 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5 text-zinc-500" />
                        {activeLead.phoneNumber.startsWith("62800") ? "Log Order Kasir Studio" : activeLead.phoneNumber}
                      </span>
                      {activeLead.source === "LOG_ORDER" && (
                        <span className="text-[9px] bg-zinc-800 text-zinc-300 border border-zinc-700 px-1.5 py-0.2 rounded font-sans font-medium">
                          Buku Log Studio
                        </span>
                      )}
                      <span className="text-zinc-600">·</span>
                      <span>Owner: {activeLead.leadOwner || "Admin CS"}</span>
                      <span className="text-zinc-600">·</span>
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
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-2xs cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-zinc-300" />
                    <span className="hidden sm:inline">
                      {isLeadConverted ? "Edit Pembayaran DP" : "Konfirmasi DP Masuk"}
                    </span>
                    <span className="sm:hidden">{isLeadConverted ? "Edit DP" : "Input DP"}</span>
                  </button>

                  <a
                    href={`https://wa.me/${activeLead.phoneNumber.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Buka Chat WA</span>
                    <span className="sm:hidden">WA</span>
                  </a>
                </div>
              </div>

              {/* ══════════ STICKY PIN: BUKTI TRANSAKSI PEMBAYARAN DP TERVERIFIKASI ══════════ */}
              {isLeadConverted && (
                <div className="mx-3 sm:mx-4 mt-2.5 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 shadow-2xs flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center shrink-0">
                      <Pin className="w-3 h-3 fill-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-200 bg-zinc-800 border border-zinc-700 px-1.5 py-0.2 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                          Bukti DP Sah
                        </span>
                        {activeLead.revenue && activeLead.revenue > 0 ? (
                          <span className="text-xs font-bold text-white font-mono">
                            Rp {activeLead.revenue.toLocaleString("id-ID")}
                          </span>
                        ) : null}
                        <span className="text-zinc-600 hidden sm:inline">·</span>
                        <span className="text-[11px] text-zinc-300 font-medium truncate max-w-xs sm:max-w-md">
                          {activeLead.bookingNotes || "Bukti transfer DP telah diverifikasi sah"}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                        Jadwal terkunci · Follow up nonaktif · Verifikasi DP: {activeLead.closingAdmin || activeLead.leadOwner || "Admin"}
                      </p>
                    </div>
                  </div>

                  {/* Tombol Loncat ke Chat Bukti */}
                  {conversionInteraction && (
                    <button
                      onClick={scrollToConversionMessage}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-[11px] font-medium transition-all shadow-2xs shrink-0 cursor-pointer"
                      title="Lihat pesan struk transfer di dalam riwayat chat"
                    >
                      <ArrowDownCircle className="w-3 h-3 text-zinc-300" />
                      <span className="hidden sm:inline">Lihat di Chat</span>
                    </button>
                  )}
                </div>
              )}

              {/* ── Chat Messages Scroll Area ── */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
                {chatMessages.length === 0 && (
                  <p className="text-center text-zinc-500 text-xs pt-8">Belum ada percakapan tercatat.</p>
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
                          ? "bg-zinc-900/80 border border-zinc-700/80"
                          : ""
                      }`}
                    >
                      {/* Pinned Conversion Badge inside the message stream */}
                      {isThisConversionTrigger && (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-200 mb-0.5 pl-1">
                          <Pin className="w-3 h-3 text-zinc-300 fill-zinc-300" />
                          <span>📌 Bukti Transaksi Konversi (DP / Pelunasan)</span>
                        </div>
                      )}

                      {/* 1. Customer Inbound Bubble (Left-aligned) */}
                      <div className="flex flex-col items-start max-w-[85%] sm:max-w-[75%]">
                        <span className="text-[10px] text-zinc-400 mb-0.5 pl-1 flex items-center gap-1">
                          <span>{activeLead.name || "Customer"}</span>
                          <span>·</span>
                          <span>{formatTime(msg.createdAt)}</span>
                          {msg.isHighPriority && activeLead.temperature !== "COLD" && (
                            <span className="ml-1 text-zinc-200 font-bold flex items-center gap-0.5">
                              <Flame className="w-2.5 h-2.5 inline text-amber-400" /> URGENT
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
                                  ? "bg-zinc-800 border border-zinc-600 text-white font-medium"
                                  : "bg-zinc-800/90 border border-zinc-700 text-zinc-100"
                              }`}
                            >
                              {cleanText ? cleanText : (mediaUrl ? "Mengirim foto bukti transfer:" : msg.messageText)}
                              {mediaUrl && (
                                <div className="mt-2 pt-2 border-t border-zinc-700">
                                  <div
                                    onClick={() => setSelectedImageModalUrl(mediaUrl)}
                                    className="group relative rounded-lg overflow-hidden border border-zinc-700 hover:border-zinc-500 bg-zinc-900 transition-all cursor-pointer inline-block max-w-xs shadow-2xs"
                                    title="Klik untuk memperbesar bukti transfer"
                                  >
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-950/90 text-white text-[10px] font-medium backdrop-blur-xs">
                                      <ImageIcon className="w-3 h-3 text-emerald-400" />
                                      <span>SS Bukti Transfer</span>
                                      <span className="text-zinc-400 ml-auto text-2xs group-hover:text-white">
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
                                className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700"
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
                          className="rounded-xl px-3 py-2.5 text-xs leading-relaxed space-y-2 border w-full shadow-2xs bg-zinc-900/90 border-zinc-800 text-zinc-300"
                        >
                          {/* Intent & Scores Bar */}
                          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-zinc-800 pb-1.5">
                            <div className="flex items-center gap-1.5">
                              <Sparkles
                                className="w-3 h-3 text-zinc-300"
                              />
                              <span
                                className="font-semibold text-[11px] text-zinc-200"
                              >
                                {isThisConversionTrigger ? "Verifikasi Vision AI" : "Analisis AI Gemini"}
                              </span>
                              {msg.intentCategory && (
                                <span
                                  className="px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700"
                                >
                                  {msg.intentCategory}
                                </span>
                              )}
                              {msg.sentiment && (
                                <span className="bg-zinc-800 text-zinc-400 border border-zinc-700 px-1.5 py-0.2 rounded-full text-[10px]">
                                  {msg.sentiment}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-400 font-medium">
                              Skor {msg.leadScore}/100 · Urgensi {msg.urgencyScore}/5
                            </span>
                          </div>

                          {/* Summary */}
                          {msg.summary && (
                            <p className="text-zinc-300 text-[11px] leading-relaxed">
                              <span className="font-semibold text-zinc-100">Kebutuhan: </span>
                              {msg.summary}
                            </p>
                          )}

                          {/* Suggested Action */}
                          {msg.suggestedAction && (
                            <div className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 text-[11px]">
                              <ChevronRight className="w-3 h-3 text-zinc-300 shrink-0" />
                              <span className="font-semibold text-zinc-200 shrink-0">Tindakan CS: </span>
                              <span className="text-zinc-300 truncate">{msg.suggestedAction}</span>
                            </div>
                          )}

                          {/* Recommended Reply (Human-in-the-loop preview) */}
                          {msg.recommendedReply && (
                            <div className="bg-zinc-800/90 border border-zinc-700/80 rounded-lg p-2.5 space-y-1 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-amber-400 text-[10px] flex items-center gap-1">
                                  💬 Draf Balasan CS (Ramah &amp; Santai)
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleReanalyze(msg.id)}
                                    disabled={reanalyzingId === msg.id}
                                    className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer disabled:opacity-50"
                                    title="Buat ulang draf dengan gaya human AI terbaru"
                                  >
                                    <RefreshCw className={`w-2.5 h-2.5 ${reanalyzingId === msg.id ? "animate-spin" : ""}`} />
                                    <span>{reanalyzingId === msg.id ? "..." : "Regenerate"}</span>
                                  </button>
                                  <button
                                    onClick={() => copyToClipboard(msg.recommendedReply!, msg.id)}
                                    className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 font-medium transition-colors cursor-pointer"
                                  >
                                    {copiedId === msg.id ? (
                                      <>
                                        <CheckCheck className="w-3 h-3 text-emerald-400" />
                                        <span className="text-emerald-400">Tersalin!</span>
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
                              <p className="italic text-zinc-200 text-xs leading-relaxed">
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
                <div className="border-t border-zinc-800 px-4 py-2.5 bg-zinc-900 shrink-0 shadow-xs">
                  <div className="text-[11px] font-medium text-zinc-400 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold text-zinc-200">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Saran Balasan AI (Siap Review &amp; Kirim)
                    </span>
                    <button
                      onClick={() => handleReanalyze(latestWithReply.id)}
                      disabled={reanalyzingId === latestWithReply.id}
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer disabled:opacity-50"
                      title="Perbarui draf dengan AI gaya ramah humanis terbaru"
                    >
                      <RefreshCw className={`w-3 h-3 ${reanalyzingId === latestWithReply.id ? "animate-spin" : ""}`} />
                      <span>{reanalyzingId === latestWithReply.id ? "Menganalisis..." : "⚡ Buat Ulang"}</span>
                    </button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 bg-zinc-800 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-100 leading-relaxed italic max-h-20 overflow-y-auto">
                      &ldquo;{latestWithReply.recommendedReply}&rdquo;
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => copyToClipboard(latestWithReply.recommendedReply!, "bottom-bar")}
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-all cursor-pointer shadow-2xs border border-zinc-700"
                      >
                        {copiedId === "bottom-bar" ? (
                          <>
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-zinc-400" />
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full border border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-zinc-950 text-white flex items-center justify-between border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Konfirmasi Pembayaran DP (Booking)</h3>
                  <p className="text-2xs text-zinc-400">
                    {activeLead.name || "Customer"} · {activeLead.phoneNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMarkBookingModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleMarkBookingSubmit} className="p-5 space-y-4">
              {/* Informational Alert Box */}
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/80 rounded-xl text-[11px] text-emerald-200 flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Aturan Konversi Foxe Studio:</strong> Leads terhitung sebagai <em>Konversi Resmi</em> secara khusus dari pembayaran <strong>DP (Down Payment)</strong>.
                </span>
              </div>

              {/* 1. Jenis Pembayaran */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
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
                        ? "bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/20"
                        : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    <span>DP (Uang Muka)</span>
                    <span className="text-[9px] text-emerald-400 font-semibold uppercase">✓ Dihitung Konversi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBookingPaymentType("Pelunasan");
                      setBookingAmount(350000);
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer text-left flex flex-col gap-0.5 ${
                      bookingPaymentType === "Pelunasan"
                        ? "bg-zinc-700 border-zinc-500 text-zinc-100 ring-2 ring-zinc-500/20"
                        : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    <span>Pelunasan Penuh</span>
                    <span className="text-[9px] text-zinc-400 font-normal">Sisa Pembayaran Sesi</span>
                  </button>
                </div>
              </div>

              {/* 2. Nominal */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Nominal Pembayaran (Rp):
                </label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={5000}
                  value={bookingAmount}
                  onChange={(e) => setBookingAmount(Number(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 text-sm font-semibold rounded-xl border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-zinc-800 text-zinc-100 placeholder-zinc-500"
                  placeholder="Contoh: 150000"
                />
                {/* Presets */}
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {[150000, 200000, 350000, 400000, 500000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setBookingAmount(amt)}
                      className="text-2xs font-semibold px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
                    >
                      Rp {(amt / 1000).toLocaleString("id-ID")}rb
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Bank / Metode */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Metode Pembayaran:
                </label>
                <select
                  value={bookingBank}
                  onChange={(e) => setBookingBank(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-zinc-800 text-zinc-100"
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
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Catatan Transaksi (Opsional):
                </label>
                <input
                  type="text"
                  value={bookingNotesInput}
                  onChange={(e) => setBookingNotesInput(e.target.value)}
                  placeholder="Contoh: Paket Graduation UGM, sesi tgl 28 Sept"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-zinc-800 text-zinc-100 placeholder-zinc-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowMarkBookingModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors cursor-pointer"
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedImageModalUrl(null)}
        >
          <div
            className="relative max-w-2xl max-h-[90vh] bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 text-white text-xs border-b border-zinc-800">
              <span className="font-semibold flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                Bukti Transfer / Struk Pembayaran DP
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={selectedImageModalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
                  title="Buka di tab baru"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setSelectedImageModalUrl(null)}
                  className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-3 overflow-auto flex items-center justify-center bg-zinc-950">
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
          records={(() => {
            const targetDay = dailyReportModalDay;
            const staticRecs = (logOrderRaw as LogOrderEntry[]).filter((r) => r.day === targetDay);
            const dbLeadsForDay = leadsState.filter((l) => isLeadDPBookingOnDay(l, targetDay));
            const extraEntries: LogOrderEntry[] = [];
            dbLeadsForDay.forEach((l) => {
              const lClean = (l.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
              const alreadyInStatic = Boolean(
                lClean && staticRecs.some((r) => r.client.toLowerCase().replace(/[^a-z0-9]/g, "") === lClean)
              );
              if (!alreadyInStatic) {
                extraEntries.push({
                  day: targetDay,
                  date: `2026-09-${String(targetDay).padStart(2, "0")}`,
                  client: l.name || "Customer",
                  paket: l.bookingNotes || "Photofox",
                  nominal: l.revenue && l.revenue > 0 ? l.revenue : 100000,
                  admin: l.closingAdmin || l.leadOwner || "Admin Studio",
                });
              }
            });
            return [...staticRecs, ...extraEntries];
          })()}
          leads={leadsState}
          isOpen={dailyReportModalDay !== null}
          inboundChatCount={
            dailyInboundChats[dailyReportModalDay] !== undefined
              ? dailyInboundChats[dailyReportModalDay]
              : getActiveLeadsForDay(dailyReportModalDay).filter((l) =>
                  isLeadBrandNewCustomerOnDay(l, dailyReportModalDay)
                ).length
          }
          isAutoInbound={dailyInboundChats[dailyReportModalDay] === undefined}
          onOpenInputChat={(d) => {
            setInputChatDay(d);
            setInputChatVal(
              dailyInboundChats[d] !== undefined
                ? dailyInboundChats[d]
                : getActiveLeadsForDay(d).filter((l) =>
                    isLeadBrandNewCustomerOnDay(l, d)
                  ).length
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl max-w-sm w-full border border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 bg-zinc-950 text-white flex items-center justify-between border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">Input Leads New Customers</h3>
                  <p className="text-2xs text-zinc-400">
                    Tanggal {inputChatDay} September 2026
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInputChatModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDailyInboundChats} className="p-5 space-y-4">
              <div className="text-xs text-zinc-300 leading-relaxed bg-zinc-800/80 p-3 rounded-xl border border-zinc-700/80">
                <div className="flex items-center gap-1.5 font-bold text-zinc-100 mb-1">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>Sistem Otomatis Demand Baru Aktif</span>
                </div>
                CRM secara otomatis menghitung <strong>{getActiveLeadsForDay(inputChatDay).filter((l) => isLeadBrandNewCustomerOnDay(l, inputChatDay)).length} pelanggan baru</strong> yang pertama kali chat pada tanggal ini. Chat lanjutan pelanggan lampau otomatis disaring keluar agar data demand tidak rancu.
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Jumlah Leads New Customers:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={inputChatVal || ""}
                    onChange={(e) => setInputChatVal(Number(e.target.value) || 0)}
                    placeholder={`Otomatis CRM: ${getActiveLeadsForDay(inputChatDay).filter((l) => isLeadBrandNewCustomerOnDay(l, inputChatDay)).length}`}
                    className="w-full px-3.5 py-2.5 text-lg font-extrabold text-zinc-100 rounded-xl border border-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400 bg-zinc-800 pr-20"
                    autoFocus
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 font-mono">
                    New Leads
                  </span>
                </div>
              </div>

              {inputChatVal > 0 && (
                <div className="p-3 bg-zinc-800/80 border border-zinc-700 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between items-center font-bold text-zinc-100">
                    <span className="flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-zinc-300" />
                      <span>Estimasi Rate Konversi:</span>
                    </span>
                    <span className="text-sm font-extrabold text-white font-mono">
                      {((bookingCount / inputChatVal) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-2xs text-zinc-400 leading-relaxed">
                    {bookingCount} transaksi DP sah closing dari demand {inputChatVal} customer baru.
                  </div>
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2 border-t border-zinc-800">
                {dailyInboundChats[inputChatDay] !== undefined && (
                  <button
                    type="button"
                    onClick={() => handleResetDailyInboundChats(inputChatDay)}
                    className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Gunakan Hitungan Otomatis CRM ({getActiveLeadsForDay(inputChatDay).filter((l) => isLeadBrandNewCustomerOnDay(l, inputChatDay)).length} New Leads)</span>
                  </button>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowInputChatModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-950 bg-white hover:bg-zinc-200 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
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
