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
            take: 1,
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

    // 2. Metrik Konversi Leads & Reminder CS (Countable Bulanan)
    const totalLeads = allLeads.length;
    const convertedLeads = allLeads.filter((l) => l.status === "BOOKING" || l.hasBooking);
    const conversionCount = convertedLeads.length;
    const conversionRate = totalLeads > 0 ? Math.round((conversionCount / totalLeads) * 100) : 0;
    const totalConvertedRevenue = convertedLeads.reduce((acc, l) => acc + (l.revenue || 0), 0);

    // Reminder Box: Leads yang baru terkonfirmasi bayar atau prioritas tinggi yang perlu balasan/tindakan CS
    const pendingReminders = allLeads
      .filter((l) => l.status === "BOOKING" || l.hasBooking || l.interactions.some((i) => i.isHighPriority))
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
          summary: latest?.summary || l.contextNotes || "Pembayaran terverifikasi via AI OCR",
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

    allLeads.forEach((lead) => {
      const adminName =
        lead.closingAdmin || lead.leadOwner || lead.interactions[0]?.handledByAdmin || "Admin CS";
      const existing = csPerformanceMap.get(adminName) || {
        adminName,
        handledLeads: 0,
        convertedLeads: 0,
        totalRevenue: 0,
        conversionRate: 0,
      };
      existing.handledLeads += 1;
      if (lead.status === "BOOKING" || lead.hasBooking) {
        existing.convertedLeads += 1;
        existing.totalRevenue += lead.revenue || 0;
      }
      existing.conversionRate =
        existing.handledLeads > 0 ? Math.round((existing.convertedLeads / existing.handledLeads) * 100) : 0;
      csPerformanceMap.set(adminName, existing);
    });

    const csPerformance = Array.from(csPerformanceMap.values()).sort(
      (a, b) => b.convertedLeads - a.convertedLeads
    );

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
