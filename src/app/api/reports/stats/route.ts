import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const allReports = await prisma.dailyReport.findMany({
      orderBy: { reportDate: "desc" },
      include: { expenseItems: true },
    });

    if (allReports.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          kpi: {
            totalRevenue: 0,
            netRevenue: 0,
            totalExpenses: 0,
            totalTransactions: 0,
            totalCustomers: 0,
            balancedCashShifts: 0,
            totalShifts: 0,
            averageOrderValue: 0,
          },
          paymentSplit: [],
          dailyTrend: [],
          recentReports: [],
        },
      });
    }

    // Hitung total agregat
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
      },
    });
  } catch (error: any) {
    console.error("Error in stats:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memproses statistik: " + error.message },
      { status: 500 }
    );
  }
}
