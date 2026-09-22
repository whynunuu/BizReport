import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with sample products, packages, reports, and detailed orders...");

  // Hapus data lama agar bersih
  await prisma.product.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.expenseItem.deleteMany({});
  await prisma.dailyReport.deleteMany({});

  // 1. Seed Katalog Produk & Paket Penjualan
  const sampleProducts = [
    // PAKET BUNDLING / COMBO
    {
      name: "Paket Sarapan Hemat",
      category: "Paket",
      price: 45000,
      description: "1x Kopi Susu Gula Aren + 1x Butter Croissant",
      isPackage: true,
      packageItems: "1 Kopi Susu Gula Aren, 1 Butter Croissant",
      badge: "HEMAT 15%",
    },
    {
      name: "Paket Nongkrong Ber-4",
      category: "Paket",
      price: 110000,
      description: "4x Kopi Susu Aren + 1x Truffle Cheese Fries Jumbo",
      isPackage: true,
      packageItems: "4 Kopi Susu Aren, 1 Truffle Cheese Fries",
      badge: "BEST SELLER",
    },
    {
      name: "Paket Combo Chill",
      category: "Paket",
      price: 55000,
      description: "1x Matcha Latte Oatmilk + 1x Cinnamon Roll",
      isPackage: true,
      packageItems: "1 Matcha Latte, 1 Cinnamon Roll",
      badge: "HEMAT",
    },
    {
      name: "Paket Meeting Box (10 Pax)",
      category: "Paket",
      price: 260000,
      description: "5x Kopi Susu + 5x Tea + 10x Mini Pastry Assorted",
      isPackage: true,
      packageItems: "5 Kopi Susu, 5 Tea, 10 Mini Pastry",
      badge: "KANTOR",
    },

    // MENU SATUAN - COFFEE
    {
      name: "Kopi Susu Gula Aren",
      category: "Coffee",
      price: 22000,
      description: "Espresso robusta blend dengan susu segar dan gula aren murni",
      isPackage: false,
      badge: "BEST SELLER",
    },
    {
      name: "Iced Americano",
      category: "Coffee",
      price: 25000,
      description: "Double shot espresso dengan air dingin segar",
      isPackage: false,
    },
    {
      name: "Manual Brew V60",
      category: "Coffee",
      price: 30000,
      description: "Single origin Arabica Gayo / Mandheling pour over filter",
      isPackage: false,
    },
    {
      name: "Iced Caramel Macchiato",
      category: "Coffee",
      price: 34000,
      description: "Vanilla syrup, steamed milk, espresso, dan saus karamel legit",
      isPackage: false,
    },

    // MENU SATUAN - NON-COFFEE
    {
      name: "Matcha Latte Oatmilk",
      category: "Non-Coffee",
      price: 32000,
      description: "Uji matcha jepang dipadukan dengan creamy-nya susu gandum oat",
      isPackage: false,
      badge: "FAVORITE",
    },
    {
      name: "Earl Grey Milk Tea",
      category: "Non-Coffee",
      price: 26000,
      description: "Teh hitam aroma bergamot dengan susu segar",
      isPackage: false,
    },
    {
      name: "Mineral Water",
      category: "Non-Coffee",
      price: 14500,
      description: "Air mineral botol 330ml",
      isPackage: false,
    },

    // MENU SATUAN - PASTRY & FOOD
    {
      name: "Butter Croissant",
      category: "Pastry",
      price: 31000,
      description: "French croissant renyah dengan butter premium",
      isPackage: false,
      badge: "BEST SELLER",
    },
    {
      name: "Almond Croissant",
      category: "Pastry",
      price: 34000,
      description: "Croissant isi krim almond lembut dengan taburan kacang almond",
      isPackage: false,
    },
    {
      name: "Cinnamon Roll",
      category: "Pastry",
      price: 28000,
      description: "Roti gulung kayu manis dengan glaze cream cheese",
      isPackage: false,
    },
    {
      name: "Pain Au Chocolat",
      category: "Pastry",
      price: 28000,
      description: "Roti pastry prancis dengan isian dua batang cokelat leleh",
      isPackage: false,
    },
    {
      name: "Truffle Cheese Fries",
      category: "Food",
      price: 42000,
      description: "Kentang goreng renyah dengan aroma minyak truffle dan parutan keju",
      isPackage: false,
      badge: "BEST SELLER",
    },
  ];

  for (const p of sampleProducts) {
    await prisma.product.create({ data: p });
  }

  // 2. Buat Laporan Harian Hari Ini beserta Order
  await prisma.dailyReport.create({
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
                { productName: "Paket Sarapan Hemat", category: "Paket", quantity: 1, unitPrice: 45000, subtotal: 45000, notes: "Kopi less sugar, croissant hangat" },
                { productName: "Iced Americano", category: "Coffee", quantity: 1, unitPrice: 25000, subtotal: 25000 },
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
                { productName: "Manual Brew V60", category: "Coffee", quantity: 1, unitPrice: 30000, subtotal: 30000, notes: "Beans Gayo, Japanese iced" },
                { productName: "Cinnamon Roll", category: "Pastry", quantity: 1, unitPrice: 28000, subtotal: 28000 },
              ],
            },
          },
          {
            orderNumber: "ORD-20260922-003",
            orderDate: new Date("2026-09-22T08:10:00Z"),
            customerName: "Meja Kantor (Mas Adit)",
            tableNumber: "Meja 08",
            orderType: "Dine In",
            paymentMethod: "QRIS",
            subtotal: 110000,
            discount: 0,
            totalAmount: 110000,
            status: "COMPLETED",
            cashierName: "Budi Santoso",
            items: {
              create: [
                { productName: "Paket Nongkrong Ber-4", category: "Paket", quantity: 1, unitPrice: 110000, subtotal: 110000, notes: "Semua es normal" },
              ],
            },
          },
        ],
      },
    },
  });

  console.log("Seeding complete! Successfully seeded 16 products & packages, plus realistic orders.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
