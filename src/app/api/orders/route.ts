import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/orders - Mengambil daftar bill / pesanan dengan filter slot jam
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("reportId");
    const date = searchParams.get("date");
    const timeSlot = searchParams.get("timeSlot"); // Misal: "07:20"
    const limit = Number(searchParams.get("limit")) || 100;

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

    // Jika difilter berdasarkan slot 20 menit (cth: "07:20")
    let filtered = orders;
    if (timeSlot) {
      const [slotH, slotM] = timeSlot.split(":").map(Number);
      const slotStartMinutes = slotH * 60 + slotM;
      const slotEndMinutes = slotStartMinutes + 20;

      filtered = orders.filter((o) => {
        const orderD = new Date(o.orderDate);
        const orderMinutes = orderD.getHours() * 60 + orderD.getMinutes();
        return orderMinutes >= slotStartMinutes && orderMinutes < slotEndMinutes;
      });
    }

    return NextResponse.json({ success: true, count: filtered.length, data: filtered });
  } catch (error: any) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil daftar pesanan: " + error.message },
      { status: 500 }
    );
  }
}

// POST /api/orders - Membuat pesanan / bill baru dengan jam interval 20 menit
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderNumber,
      reportId,
      orderDate,
      orderTimeSlot, // Misal: "07:20"
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

    // Tentukan waktu order
    let finalOrderDate = new Date();
    if (orderDate) {
      finalOrderDate = new Date(orderDate);
    }
    if (orderTimeSlot) {
      const [h, m] = orderTimeSlot.split(":").map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        finalOrderDate.setHours(h, m, 0, 0);
      }
    }

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
        orderDate: finalOrderDate,
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
