import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [allReports, allLeads] = await Promise.all([
      prisma.dailyReport.findMany({
        orderBy: { reportDate: "desc" },
        include: { expenseItems: true },
      }),
      prisma.lead.findMany({
        include: {
          interactions: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    // 1. Agregat Pembukuan Kasir Studio
    const totalRevenue = allReports.reduce((acc, r) => acc + r.grossSales, 0);
    const netRevenue = allReports.reduce((acc, r) => acc + r.netSales, 0);
    const totalExpenses = allReports.reduce((acc, r) => acc + r.totalExpenses, 0);
    const totalTransactions = allReports.reduce((acc, r) => acc + r.totalTransactions, 0);
    const totalCustomers = allReports.reduce((acc, r) => acc + r.customerCount, 0);
    const balancedCashShifts = allReports.filter((r) => Math.abs(r.cashDifference) < 100).length;

    // Rata-rata order value (AOV)
    const averageOrderValue =
      totalTransactions > 0 ? Math.round(netRevenue / totalTransactions) : 0;

    // Pembagian metode pembayaran
    const totalCash = allReports.reduce((acc, r) => acc + r.cashSales, 0);
    const totalQris = allReports.reduce((acc, r) => acc + r.qrisSales, 0);
    const totalDebit = allReports.reduce((acc, r) => acc + r.debitCardSales, 0);
    const totalDelivery = allReports.reduce((acc, r) => acc + r.onlineDelivery, 0);
    const totalTransfer = allReports.reduce((acc, r) => acc + r.transferSales, 0);

    const paymentSplit = [
      { name: "QRIS", value: totalQris, color: "#3b82f6" },
      { name: "Tunai (Cash)", value: totalCash, color: "#10b981" },
      { name: "Debit EDC", value: totalDebit, color: "#8b5cf6" },
      { name: "Online Food", value: totalDelivery, color: "#f59e0b" },
      { name: "Transfer Bank", value: totalTransfer, color: "#6366f1" },
    ].filter((p) => p.value > 0);

    // Tren 7 hari terakhir
    const trendMap = new Map<string, { date: string; gross: number; net: number; expenses: number }>();
    allReports.forEach((r) => {
      const dateStr = new Date(r.reportDate).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
      });
      const existing = trendMap.get(dateStr) || { date: dateStr, gross: 0, net: 0, expenses: 0 };
      existing.gross += r.grossSales;
      existing.net += r.netSales;
      existing.expenses += r.totalExpenses;
      trendMap.set(dateStr, existing);
    });

    const dailyTrend = Array.from(trendMap.values()).reverse();

    // 2. Metrik Konversi Leads & Reminder CS (Countable Bulanan - Comprehensive DP & Booking Check)
    const isLeadDP = (l: (typeof allLeads)[number]) => {
      const isBooking = l.status === "BOOKING" || l.hasBooking || l.source === "LOG_ORDER" || Boolean(l.revenue && l.revenue > 0);
      if (!isBooking) return false;
      
      // Jika lead berasal dari LOG_ORDER, dipastikan DP
      if (l.source === "LOG_ORDER" || l.hasBooking || l.status === "BOOKING") {
        return true;
      }

      const hasDPInNotes = Boolean(
        l.bookingNotes && /\b(dp|down payment|uang muka|transfer|bayar|log order|raw files|ocr|terverifikasi)\b/i.test(l.bookingNotes)
      );
      const hasDPInInteractions = Boolean(
        l.interactions.some((i) =>
          /\b(dp|down payment|uang muka|payment|receipt|log_order_dp|raw_files_job)\b/i.test(i.ruleSignals || "") ||
          /\[konfirmasi pembayaran\]/i.test(i.messageText || "") ||
          /\bdp via\b/i.test(i.messageText || "")
        )
      );
      return hasDPInNotes || hasDPInInteractions || (Boolean(l.revenue) && l.revenue > 0);
    };

    const totalLeads = allLeads.length;
    const convertedLeads = allLeads.filter(isLeadDP);
    const conversionCount = convertedLeads.length;
    const conversionRate = totalLeads > 0 ? Math.round((conversionCount / totalLeads) * 100) : 0;
    const totalConvertedRevenue = convertedLeads.reduce((acc, l) => acc + (l.revenue || 0), 0);

    // Reminder Box: Leads yang baru terkonfirmasi DP atau prioritas tinggi yang perlu balasan/tindakan CS
    const pendingReminders = allLeads
      .filter((l) => isLeadDP(l) || l.interactions.some((i) => i.isHighPriority))
      .slice(0, 5)
      .map((l) => {
        const latest = l.interactions[0];
        return {
          leadId: l.id,
          name: l.name || "Customer",
          phoneNumber: l.phoneNumber,
          status: l.status,
          revenue: l.revenue,
          bookingNotes: l.bookingNotes,
          summary: latest?.summary || l.contextNotes || "Pembayaran DP terverifikasi sah",
          recommendedReply: latest?.recommendedReply || "",
          assignedAdmin: l.closingAdmin || l.leadOwner || latest?.handledByAdmin || "Admin CS",
          updatedAt: l.updatedAt.toISOString(),
        };
      });

    // KPI Performa CS per Staff (Countable untuk evaluasi akhir bulan)
    const csPerformanceMap = new Map<
      string,
      {
        adminName: string;
        handledLeads: number;
        convertedLeads: number;
        totalRevenue: number;
        conversionRate: number;
      }
    >();

    // Inisialisasi slot Admin 1 dan Admin 2 secara default
    const admin1Key = "Admin 1 (Shift 09:00 - 15:00)";
    const admin2Key = "Admin 2 (Shift 15:00 - 21:00)";

    csPerformanceMap.set(admin1Key, {
      adminName: admin1Key,
      handledLeads: 0,
      convertedLeads: 0,
      totalRevenue: 0,
      conversionRate: 0,
    });

    csPerformanceMap.set(admin2Key, {
      adminName: admin2Key,
      handledLeads: 0,
      convertedLeads: 0,
      totalRevenue: 0,
      conversionRate: 0,
    });

    allLeads.forEach((lead) => {
      const rawAdmin =
        lead.closingAdmin || lead.leadOwner || lead.interactions[0]?.handledByAdmin || "";
      const isShift2 = rawAdmin.includes("2") || rawAdmin.toLowerCase().includes("indah");
      const targetKey = isShift2 ? admin2Key : admin1Key;

      const existing = csPerformanceMap.get(targetKey)!;
      existing.handledLeads += 1;
      if (isLeadDP(lead)) {
        existing.convertedLeads += 1;
        existing.totalRevenue += lead.revenue || 0;
      }
      existing.conversionRate =
        existing.handledLeads > 0 ? Math.round((existing.convertedLeads / existing.handledLeads) * 100) : 0;
    });

    const csPerformance = Array.from(csPerformanceMap.values());

    return NextResponse.json({
      success: true,
      data: {
        kpi: {
          totalRevenue,
          netRevenue,
          totalExpenses,
          totalTransactions,
          totalCustomers,
          balancedCashShifts,
          totalShifts: allReports.length,
          averageOrderValue,
        },
        paymentSplit,
        dailyTrend,
        recentReports: allReports.slice(0, 5),
        conversionKpi: {
          totalLeads,
          convertedLeads: conversionCount,
          conversionRate,
          totalConvertedRevenue,
          reminders: pendingReminders,
          csPerformance,
        },
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Gagal memproses statistik";
    console.error("Error in stats:", error);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
