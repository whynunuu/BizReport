import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with sample reports and detailed orders/bills...");

  // Hapus data lama agar bersih
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.expenseItem.deleteMany({});
  await prisma.dailyReport.deleteMany({});

  // 1. Buat Laporan Harian Hari Ini
  const todayReport = await prisma.dailyReport.create({
    data: {
      reportDate: new Date("2026-09-22T07:00:00Z"),
      branchName: "Kopi Senja - Sudirman",
      businessType: "FnB",
      shift: "Pagi",
      staffName: "Budi Santoso",
      grossSales: 3890000,
      discountTotal: 140000,
      netSales: 3750000,
      taxAndService: 0,
      totalTransactions: 72,
      customerCount: 105,
      cashSales: 1250000,
      qrisSales: 1950000,
      debitCardSales: 450000,
      creditCardSales: 0,
      onlineDelivery: 100000,
      transferSales: 0,
      openingCashFloat: 300000,
      totalExpenses: 90000,
      expectedCash: 1460000,
      actualCashInDrawer: 1460000,
      cashDifference: 0,
      differenceReason: null,
      operationalNotes: "Hari ini ramai meeting pagi. Pastry croissant habis terjual jam 11.",
      status: "COMPLETED",
      verifiedBy: null,
      expenseItems: {
        create: [
          { description: "Es Batu Kristal 3 karung", category: "Bahan Baku", amount: 65000 },
          { description: "Tissue meja makan", category: "Kebersihan", amount: 25000 },
        ],
      },
      orders: {
        create: [
          {
            orderNumber: "ORD-20260922-001",
            orderDate: new Date("2026-09-22T07:15:00Z"),
            customerName: "Kak Reza",
            tableNumber: "Meja 03",
            orderType: "Dine In",
            paymentMethod: "QRIS",
            subtotal: 75000,
            discount: 5000,
            totalAmount: 70000,
            status: "COMPLETED",
            cashierName: "Budi Santoso",
            items: {
              create: [
                { productName: "Kopi Susu Gula Aren", category: "Coffee", quantity: 2, unitPrice: 22000, subtotal: 44000, notes: "1 less sugar" },
                { productName: "Butter Croissant", category: "Pastry", quantity: 1, unitPrice: 31000, subtotal: 31000, notes: "Dipanaskan" },
              ],
            },
          },
          {
            orderNumber: "ORD-20260922-002",
            orderDate: new Date("2026-09-22T07:42:00Z"),
            customerName: "Mas Danu",
            tableNumber: "Bar 02",
            orderType: "Dine In",
            paymentMethod: "CASH",
            subtotal: 58000,
            discount: 0,
            totalAmount: 58000,
            status: "COMPLETED",
            cashierName: "Budi Santoso",
            items: {
              create: [
                { productName: "Manual Brew V60 (Beans Gayo)", category: "Coffee", quantity: 1, unitPrice: 30000, subtotal: 30000, notes: "Japanese iced style" },
                { productName: "Cinnamon Roll", category: "Pastry", quantity: 1, unitPrice: 28000, subtotal: 28000 },
              ],
            },
          },
          {
            orderNumber: "ORD-20260922-003",
            orderDate: new Date("2026-09-22T08:10:00Z"),
            customerName: "Driver GoFood (Bpk Slamet)",
            tableNumber: "Pickup Area",
            orderType: "Delivery",
            paymentMethod: "ONLINE_FOOD",
            subtotal: 96000,
            discount: 10000,
            totalAmount: 86000,
            status: "COMPLETED",
            cashierName: "Budi Santoso",
            items: {
              create: [
                { productName: "Kopi Susu Pandan (1 Liter)", category: "Coffee", quantity: 1, unitPrice: 75000, subtotal: 75000 },
                { productName: "Extra Espresso Shot", category: "Coffee", quantity: 1, unitPrice: 6000, subtotal: 6000 },
                { productName: "Almond Croissant", category: "Pastry", quantity: 1, unitPrice: 15000, subtotal: 15000 },
              ],
            },
          },
          {
            orderNumber: "ORD-20260922-004",
            orderDate: new Date("2026-09-22T08:35:00Z"),
            customerName: "Ibu Maya",
            tableNumber: "Meja 07",
            orderType: "Dine In",
            paymentMethod: "QRIS",
            subtotal: 135000,
            discount: 0,
            totalAmount: 135000,
            status: "COMPLETED",
            cashierName: "Budi Santoso",
            items: {
              create: [
                { productName: "Matcha Latte Oatmilk", category: "Non-Coffee", quantity: 2, unitPrice: 32000, subtotal: 64000, notes: "Normal ice" },
                { productName: "Truffle Cheese Fries", category: "Food", quantity: 1, unitPrice: 42000, subtotal: 42000 },
                { productName: "Mineral Water", category: "Non-Coffee", quantity: 2, unitPrice: 14500, subtotal: 29000 },
              ],
            },
          },
          {
            orderNumber: "ORD-20260922-005",
            orderDate: new Date("2026-09-22T09:05:00Z"),
            customerName: "Pak Hendra",
            tableNumber: "Takeaway",
            orderType: "Take Away",
            paymentMethod: "DEBIT",
            subtotal: 62000,
            discount: 0,
            totalAmount: 62000,
            status: "COMPLETED",
            cashierName: "Budi Santoso",
            items: {
              create: [
                { productName: "Iced Caramel Macchiato", category: "Coffee", quantity: 1, unitPrice: 34000, subtotal: 34000 },
                { productName: "Pain Au Chocolat", category: "Pastry", quantity: 1, unitPrice: 28000, subtotal: 28000 },
              ],
            },
          },
        ],
      },
    },
  });

  // 2. Buat Laporan-laporan Kemarin (Kemarin dan Lusa)
  await prisma.dailyReport.create({
    data: {
      reportDate: new Date("2026-09-21T15:00:00Z"),
      branchName: "Kopi Senja - Sudirman",
      businessType: "FnB",
      shift: "Malam",
      staffName: "Siti Rahma",
      grossSales: 4800000,
      discountTotal: 180000,
      netSales: 4620000,
      taxAndService: 0,
      totalTransactions: 86,
      customerCount: 125,
      cashSales: 1300000,
      qrisSales: 2420000,
      debitCardSales: 600000,
      creditCardSales: 0,
      onlineDelivery: 300000,
      transferSales: 0,
      openingCashFloat: 300000,
      totalExpenses: 70000,
      expectedCash: 1530000,
      actualCashInDrawer: 1530000,
      cashDifference: 0,
      differenceReason: null,
      operationalNotes: "Semua sistem lancar. Settle EDC & QRIS sudah sesuai.",
      status: "VERIFIED",
      verifiedBy: "Manager Rian",
      expenseItems: {
        create: [
          { description: "Susu UHT Fresh Milk darurat 2 liter", category: "Bahan Baku", amount: 48000 },
          { description: "Snack staf lembur", category: "Operasional", amount: 22000 },
        ],
      },
    },
  });

  console.log("Seeding complete! Successfully created reports with linked Orders and line items.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
