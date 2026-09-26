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

// Aturan Validasi Konversi (Strict DP-Only Rule)
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
export function isLeadDPBookingOnDay(lead: Lead | null | undefined, targetDay: number | null): boolean {
  if (!lead) return false;
  if (!isLeadVerifiedDPBooking(lead)) return false;
  if (targetDay === null) return true;

  // 1. Synthetic Lead dari Log Order (format: 62800 + [Day 2 digit] + [Idx 3 digit])
  if (lead.phoneNumber.startsWith("62800")) {
    const dayPrefix = `62800${String(targetDay).padStart(2, "0")}`;
    return lead.phoneNumber.startsWith(dayPrefix);
  }

  // 2. Booking Notes spesifik mencatat "Log Order Day [targetDay]" atau "Day [targetDay]"
  if (lead.bookingNotes) {
    const match = lead.bookingNotes.match(/(?:Log Order )?Day\s*(\d+)/i);
    if (match && parseInt(match[1], 10) === targetDay) return true;
  }

  // 3. Interaksi transfer DP WhatsApp langsung yang terjadi pada targetDay
  const hasDirectWAPaymentOnDay = lead.interactions?.some((i) => {
    const isDP =
      i.ruleSignals?.includes("PAYMENT_RECEIPT_VERIFIED") ||
      i.ruleSignals?.includes("LOG_ORDER_DP") ||
      /\b(dp|down payment|uang muka|payment|receipt)\b/i.test(i.ruleSignals || "") ||
      /\[konfirmasi pembayaran\]/i.test(i.messageText || "") ||
      /\bdp via\b/i.test(i.messageText || "");

    if (!isDP) return false;
    const jk = getJakartaDate(i.createdAt);
    return jk && jk.day === targetDay && jk.month === 9 && jk.year === 2026;
  });

  if (hasDirectWAPaymentOnDay) return true;

  // 4. lastBookingDate
  if (lead.lastBookingDate) {
    const jk = getJakartaDate(lead.lastBookingDate);
    if (jk && jk.day === targetDay && jk.month === 9 && jk.year === 2026) return true;
  }

  // 5. createdAt (tanggal lead masuk pertama kali)
  if (lead.createdAt) {
    const jk = getJakartaDate(lead.createdAt);
    if (jk && jk.day === targetDay && jk.month === 9 && jk.year === 2026) return true;
  }

  return false;
}

// Aturan Action & Prioritas Chat
export function isLeadDPCompletedAndReplied(lead: Lead | null | undefined): boolean {
  if (!lead) return false;

  // Synthetic lead dari Log Order otomatis adalah arsip closing yang sudah selesai
  if (lead.phoneNumber.startsWith("62800")) {
    return true;
  }

  // Cek apakah lead sudah DP / booking / terindikasi bayar
  const isPaidOrBooking =
    lead.status === "BOOKING" ||
    lead.hasBooking ||
    Boolean(lead.revenue && lead.revenue > 0) ||
    isLeadVerifiedDPBooking(lead);

  if (!isPaidOrBooking) return false;

  // Cek apakah sudah ada setidaknya 1x balasan/pesan setelah bukti bayar
  const sortedInteractions = [...(lead.interactions || [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const paymentIdx = sortedInteractions.findIndex((i) => {
    const sig = (i.ruleSignals || "").toUpperCase();
    const txt = (i.messageText || "").toLowerCase();
    return (
      sig.includes("PAYMENT") ||
      sig.includes("DP") ||
      sig.includes("LOG_ORDER_DP") ||
      /bukti transfer|struk|transfer berhasil|dp via|pelunasan via|\[log order dp sah\]|\[konfirmasi pembayaran\]/i.test(
        txt
      )
    );
  });

  if (paymentIdx !== -1) {
    const messagesAfter = sortedInteractions.length - 1 - paymentIdx;
    return messagesAfter >= 1;
  }

  return sortedInteractions.length >= 2;
}

export function getLeadPriorityTier(lead: Lead): number {
  // Tier 3 (Paling bawah sendiri): Sudah DP & telah membalas 1x setelah bukti bayar
  if (isLeadDPCompletedAndReplied(lead)) {
    return 3;
  }

  const lastMsg = [...(lead.interactions || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  const isHotOrUrgent =
    lead.temperature === "HOT" ||
    (lastMsg?.isHighPriority ?? false) ||
    (lastMsg?.urgencyScore ?? 0) >= 4 ||
    lead.interactions?.some((i) => i.isHighPriority);

  // Tier 1 (Paling atas): HOT / Action Required
  if (isHotOrUrgent) {
    return 1;
  }

  // Tier 2 (Tengah): COLD & WARM leads to follow up
  return 2;
}

export function sortLeadsForAdminAction(leads: Lead[]): Lead[] {
  return [...leads].sort((a, b) => {
    const tierA = getLeadPriorityTier(a);
    const tierB = getLeadPriorityTier(b);

    if (tierA !== tierB) {
      return tierA - tierB; // Tier 1 (HOT) -> Tier 2 (COLD/WARM) -> Tier 3 (Completed DP bottom)
    }

    if (tierA === 1) {
      const aScore = Math.max(...(a.interactions?.map((i) => i.urgencyScore) || [0]), a.leadScore || 0);
      const bScore = Math.max(...(b.interactions?.map((i) => i.urgencyScore) || [0]), b.leadScore || 0);
      if (bScore !== aScore) return bScore - aScore;
    } else if (tierA === 2) {
      const aFollow = a.interactions?.some((i) => i.needsFollowUp) ? 1 : 0;
      const bFollow = b.interactions?.some((i) => i.needsFollowUp) ? 1 : 0;
      if (bFollow !== aFollow) return bFollow - aFollow;
    }

    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}
