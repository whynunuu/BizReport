import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/reports - Mengambil daftar laporan harian lengkap dengan rincian pengeluaran dan daftar order/bill
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branch = searchParams.get("branch");
    const shift = searchParams.get("shift");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};
    if (branch) where.branchName = branch;
    if (shift) where.shift = shift;
    if (startDate && endDate) {
      where.reportDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const reports = await prisma.dailyReport.findMany({
      where,
      include: {
        expenseItems: true,
        orders: {
          include: {
            items: true,
          },
          orderBy: {
            orderDate: "desc",
          },
        },
      },
      orderBy: {
        reportDate: "desc",
      },
    });

    return NextResponse.json({ success: true, count: reports.length, data: reports });
  } catch (error: any) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data laporan: " + error.message },
      { status: 500 }
    );
  }
}

// POST /api/reports - Menyimpan laporan harian baru
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      reportDate,
      branchName = "Pusat",
      businessType = "FnB",
      shift = "Full Day",
      staffName,
      grossSales = 0,
      discountTotal = 0,
      taxAndService = 0,
      totalTransactions = 0,
      customerCount = 0,
      cashSales = 0,
      qrisSales = 0,
      debitCardSales = 0,
      creditCardSales = 0,
      onlineDelivery = 0,
      transferSales = 0,
      openingCashFloat = 0,
      actualCashInDrawer = 0,
      differenceReason,
      operationalNotes,
      expenseItems = [],
      orders = [],
    } = body;

    if (!reportDate || !staffName) {
      return NextResponse.json(
        { success: false, error: "Tanggal laporan dan nama petugas wajib diisi." },
        { status: 400 }
      );
    }

    // Jika orders disertakan, otomatis kalkulasi subtotal omzet jika grossSales = 0
    let parsedGross = Number(grossSales) || 0;
    let computedTransactions = Number(totalTransactions) || 0;
    if (orders.length > 0 && parsedGross === 0) {
      parsedGross = orders.reduce((acc: number, o: any) => acc + (Number(o.totalAmount) || 0), 0);
      computedTransactions = orders.length;
    }

    const parsedDiscount = Number(discountTotal) || 0;
    const netSales = Math.max(0, parsedGross - parsedDiscount);

    // Hitung total pengeluaran petty cash
    const totalExpenses = (expenseItems || []).reduce(
      (acc: number, item: any) => acc + (Number(item.amount) || 0),
      0
    );

    // Kas yang seharusnya di laci
    const parsedOpeningCash = Number(openingCashFloat) || 0;
    const parsedCashSales = Number(cashSales) || 0;
    const expectedCash = parsedOpeningCash + parsedCashSales - totalExpenses;

    // Selisih kas
    const parsedActualCash = Number(actualCashInDrawer) || 0;
    const cashDifference = parsedActualCash - expectedCash;

    const report = await prisma.dailyReport.create({
      data: {
        reportDate: new Date(reportDate),
        branchName,
        businessType,
        shift,
        staffName,
        grossSales: parsedGross,
        discountTotal: parsedDiscount,
        netSales,
        taxAndService: Number(taxAndService) || 0,
        totalTransactions: computedTransactions,
        customerCount: Number(customerCount) || 0,
        cashSales: parsedCashSales,
        qrisSales: Number(qrisSales) || 0,
        debitCardSales: Number(debitCardSales) || 0,
        creditCardSales: Number(creditCardSales) || 0,
        onlineDelivery: Number(onlineDelivery) || 0,
        transferSales: Number(transferSales) || 0,
        openingCashFloat: parsedOpeningCash,
        totalExpenses,
        expectedCash,
        actualCashInDrawer: parsedActualCash,
        cashDifference,
        differenceReason: cashDifference !== 0 ? differenceReason : null,
        operationalNotes,
        status: "COMPLETED",
        expenseItems: {
          create: (expenseItems || []).map((item: any) => ({
            description: item.description || "Pengeluaran operasional",
            category: item.category || "Operasional",
            amount: Number(item.amount) || 0,
          })),
        },
        orders: {
          create: (orders || []).map((o: any, idx: number) => ({
            orderNumber: o.orderNumber || `ORD-${Date.now().toString().slice(-4)}-${idx + 1}`,
            customerName: o.customerName || "Pelanggan",
            tableNumber: o.tableNumber || "Takeaway",
            orderType: o.orderType || "Dine In",
            paymentMethod: o.paymentMethod || "QRIS",
            subtotal: Number(o.subtotal) || 0,
            discount: Number(o.discount) || 0,
            tax: Number(o.tax) || 0,
            totalAmount: Number(o.totalAmount) || 0,
            status: "COMPLETED",
            cashierName: staffName,
            items: {
              create: (o.items || []).map((i: any) => ({
                productName: i.productName || "Menu",
                category: i.category || "Coffee",
                quantity: Number(i.quantity) || 1,
                unitPrice: Number(i.unitPrice) || 0,
                subtotal: (Number(i.quantity) || 1) * (Number(i.unitPrice) || 0),
                notes: i.notes || null,
              })),
            },
          })),
        },
      },
      include: {
        expenseItems: true,
        orders: {
          include: {
            items: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: report }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating report:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan laporan: " + error.message },
      { status: 500 }
    );
  }
}
