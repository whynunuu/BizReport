import logOrderDpRaw from "@/data/log_order_dp.json";
import { Lead, Interaction } from "@/lib/crm-sorting";

interface LogOrderEntry {
  day: number;
  date: string;
  client: string;
  paket: string;
  tgl_foto: string;
  cash: number;
  transfer: number;
  nominal: number;
  admin: string;
}

const logOrderData = logOrderDpRaw as LogOrderEntry[];

/**
 * Menghasilkan daftar Lead cadangan (offline fallback) dari data log_order_dp.json
 * Digunakan secara otomatis saat Neon DB melebihi kuota atau sedang offline
 */
export function getOfflineFallbackLeads(): Lead[] {
  const fallbackLeads: Lead[] = logOrderData.map((item, idx) => {
    const adminStandard = item.admin?.toUpperCase().includes("INDAH") ? "Admin 2" : "Admin 1";
    const syntheticPhone = `62800${String(item.day).padStart(2, "0")}${String(idx + 1).padStart(3, "0")}`;
    const formattedNominal = item.nominal.toLocaleString("id-ID");
    const interactionDate = new Date(`${item.date}T10:00:00+07:00`);

    const interaction: Interaction = {
      id: `fallback-int-${idx + 1}`,
      direction: "INBOUND",
      messageText: `[LOG ORDER DP] Booking paket ${item.paket} terjadwal tanggal ${item.tgl_foto || "-"}. Pembayaran DP Rp ${formattedNominal} via Transfer terverifikasi di Log Order Studio.`,
      intentCategory: "BOOKING",
      sentiment: "POSITIF",
      urgencyScore: 5,
      leadScore: 100,
      temperature: "HOT",
      ruleSignals: `LOG_ORDER_DP, PAYMENT_RECEIPT_VERIFIED, DP, DP_DAY_${item.day}, NOMINAL_${item.nominal}, CS_${adminStandard}`,
      summary: `[DP SAH LOG ORDER] DP Rp ${formattedNominal} via Transfer tercatat (${item.paket})`,
      recommendedReply: `Siaap Kak ${item.client}! Pembayaran DP untuk paket ${item.paket} udah kami terima yaa. Jadwal foto kakak tanggal ${item.tgl_foto || "-"} udah aman kita keep! Sampai ketemu di Foxe Studio ya kak 📸✨`,
      suggestedAction: "Slot foto terkunci sesuai data pembukuan kasir.",
      priorityReason: "Pembayaran DP terverifikasi sah",
      followUpReason: "Jadwal foto terkonfirmasi",
      followUpDueDate: null,
      aiConfidence: 0.99,
      needsFollowUp: false,
      followUpStatus: "COMPLETED",
      isHighPriority: true,
      usedStrongAi: false,
      handledByAdmin: adminStandard,
      createdAt: interactionDate,
    };

    return {
      id: `fallback-lead-${idx + 1}`,
      name: item.client,
      phoneNumber: syntheticPhone,
      status: "BOOKING",
      temperature: "HOT",
      leadScore: 100,
      leadOwner: adminStandard,
      closingAdmin: adminStandard,
      source: "LOG_ORDER",
      hasBooking: true,
      revenue: item.nominal,
      bookingNotes: `DP Rp ${formattedNominal} via Transfer (${item.paket})`,
      lastBookingDate: interactionDate,
      createdAt: interactionDate,
      updatedAt: interactionDate,
      interactions: [interaction],
    };
  });

  // Urutkan dari yang terbaru (Day tertinggi / index terakhir)
  return fallbackLeads.reverse();
}

/**
 * Menghasilkan statistik ringkasan cadangan jika koneksi DB terputus
 */
export function getOfflineFallbackStats() {
  const totalTransactions = logOrderData.length;
  const totalRevenue = logOrderData.reduce((acc, cur) => acc + (cur.nominal || 0), 0);
  const netRevenue = totalRevenue;
  const totalCash = logOrderData.reduce((acc, cur) => acc + (cur.cash || 0), 0);
  const totalTransfer = logOrderData.reduce((acc, cur) => acc + (cur.transfer || 0), 0);

  // Group by day untuk tren harian
  const dayMap = new Map<string, { date: string; gross: number; net: number; expenses: number }>();
  for (const item of logOrderData) {
    const existing = dayMap.get(item.date) || { date: item.date, gross: 0, net: 0, expenses: 0 };
    existing.gross += item.nominal;
    existing.net += item.nominal;
    dayMap.set(item.date, existing);
  }

  const dailyTrend = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // CS breakdown
  const adminMap: Record<string, { convertedCount: number; totalOmzet: number }> = {};
  for (const item of logOrderData) {
    const admin = item.admin?.toUpperCase().includes("INDAH") ? "Admin 2" : "Admin 1";
    if (!adminMap[admin]) {
      adminMap[admin] = { convertedCount: 0, totalOmzet: 0 };
    }
    adminMap[admin].convertedCount += 1;
    adminMap[admin].totalOmzet += item.nominal;
  }

  const adminBreakdown = Object.entries(adminMap).map(([adminName, data]) => ({
    adminName,
    convertedCount: data.convertedCount,
    totalOmzet: data.totalOmzet,
    percentage: totalTransactions > 0 ? Math.round((data.convertedCount / totalTransactions) * 100) : 0,
  }));

  // Reminders sample
  const recentItems = logOrderData.slice(-4).reverse();
  const reminders = recentItems.map((item, i) => {
    const admin = item.admin?.toUpperCase().includes("INDAH") ? "Admin 2" : "Admin 1";
    return {
      leadId: `fallback-lead-${i + 1}`,
      name: item.client,
      phoneNumber: `62800${String(item.day).padStart(2, "0")}${String(i + 1).padStart(3, "0")}`,
      assignedAdmin: admin,
      summary: `Booking paket ${item.paket} DP Rp ${item.nominal.toLocaleString("id-ID")}`,
      recommendedReply: `Siaap Kak ${item.client}! Pembayaran DP untuk paket ${item.paket} udah kami terima yaa. Jadwal foto kakak tanggal ${item.tgl_foto || "-"} udah aman kita keep! Sampai ketemu di Foxe Studio ya kak 📸✨`,
      bookingNotes: `DP via Transfer Rp ${item.nominal.toLocaleString("id-ID")}`,
    };
  });

  return {
    kpi: {
      totalRevenue,
      netRevenue,
      totalExpenses: 0,
      totalTransactions,
      customerCount: totalTransactions,
      averageOrderValue: totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0,
      balancedCashShifts: dailyTrend.length,
      unbalancedCashShifts: 0,
    },
    paymentSplit: [
      { name: "Transfer Bank", value: totalTransfer, color: "#6366f1" },
      { name: "Tunai (Cash)", value: totalCash, color: "#10b981" },
    ].filter((p) => p.value > 0),
    dailyTrend,
    recentReports: [],
    conversionKpi: {
      totalLeads: totalTransactions,
      convertedCount: totalTransactions,
      closingRate: 100,
      totalOmzet: totalRevenue,
      adminBreakdown,
      reminders,
    },
  };
}
