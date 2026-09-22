import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/orders - Mengambil daftar bill / pesanan
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("reportId");
    const date = searchParams.get("date");
    const limit = Number(searchParams.get("limit")) || 50;

    const where: any = {};
    if (reportId) where.reportId = reportId;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.orderDate = { gte: start, lte: end };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        report: {
          select: {
            shift: true,
            branchName: true,
          },
        },
      },
      orderBy: { orderDate: "desc" },
      take: limit,
    });

    return NextResponse.json({ success: true, count: orders.length, data: orders });
  } catch (error: any) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil daftar pesanan: " + error.message },
      { status: 500 }
    );
  }
}

// POST /api/orders - Membuat pesanan / bill baru
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderNumber,
      reportId,
      customerName = "Pelanggan",
      tableNumber = "Takeaway",
      orderType = "Dine In",
      paymentMethod = "QRIS",
      subtotal = 0,
      discount = 0,
      tax = 0,
      totalAmount,
      cashierName = "Kasir",
      items = [],
    } = body;

    const generatedOrderNumber =
      orderNumber || `ORD-${Date.now().toString().slice(-6)}`;

    // Hitung total dari items jika tidak disediakan
    const calculatedSubtotal =
      items.length > 0
        ? items.reduce(
            (acc: number, item: any) =>
              acc + Number(item.unitPrice || 0) * Number(item.quantity || 1),
            0
          )
        : Number(subtotal) || 0;

    const finalTotal =
      totalAmount !== undefined
        ? Number(totalAmount)
        : calculatedSubtotal - Number(discount || 0) + Number(tax || 0);

    const order = await prisma.order.create({
      data: {
        orderNumber: generatedOrderNumber,
        reportId: reportId || null,
        customerName,
        tableNumber,
        orderType,
        paymentMethod,
        subtotal: calculatedSubtotal,
        discount: Number(discount) || 0,
        tax: Number(tax) || 0,
        totalAmount: finalTotal,
        status: "COMPLETED",
        cashierName,
        items: {
          create: (items || []).map((item: any) => ({
            productName: item.productName || "Item",
            category: item.category || "Coffee",
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            subtotal:
              (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
            notes: item.notes || null,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { success: false, error: "Gagal membuat pesanan: " + error.message },
      { status: 500 }
    );
  }
}
