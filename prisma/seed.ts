import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Foxe Studio Photo Studio pricelist ke database...");

  // Hapus semua data produk lama dulu
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});

  // ====================================================
  // FOXE STUDIO — PRICELIST RESMI
  // ====================================================
  const foxeProducts = [
    // ─── PAKET GRADUATION ───────────────────────────
    {
      name: "Graduation Standard",
      category: "Graduation",
      price: 350000,
      description: "Foto wisuda standar. Semua file digital + cetak frame. +Rp 20.000/orang tambahan.",
      isPackage: false,
      badge: "BEST SELLER",
      isAvailable: true,
    },
    {
      name: "Graduation Premium",
      category: "Graduation",
      price: 500000,
      description: "Foto wisuda premium. All file HD + cetak frame eksklusif + extra retouching. +Rp 20.000/orang tambahan.",
      isPackage: false,
      badge: "PREMIUM",
      isAvailable: true,
    },

    // ─── PAKET SELF PHOTO BOX ────────────────────────
    {
      name: "Photofox (Self Photo Box)",
      category: "Photofox",
      price: 200000,
      description: "Self photo box minimal 3 orang. Semua file digital. +Rp 25.000/orang, +Rp 100.000/tema background.",
      isPackage: false,
      badge: "POPULER",
      isAvailable: true,
    },

    // ─── PAKET LARGE GROUP ───────────────────────────
    {
      name: "Large Group (Per Pax)",
      category: "Group",
      price: 25000,
      description: "Foto kelas / sekolah / komunitas. Minimal 7 orang. Tambah tema Rp 175.000. Volume driver terbaik.",
      isPackage: false,
      badge: "VOLUME",
      isAvailable: true,
    },

    // ─── PAKET KELUARGA ──────────────────────────────
    {
      name: "Family A (Keluarga Inti)",
      category: "Family",
      price: 350000,
      description: "Sesi foto keluarga inti 3–5 orang. All file digital + cetak.",
      isPackage: false,
      isAvailable: true,
    },
    {
      name: "Family B (Keluarga Besar)",
      category: "Family",
      price: 450000,
      description: "Sesi foto keluarga besar 6–10 orang. All file digital + cetak.",
      isPackage: false,
      isAvailable: true,
    },

    // ─── PAKET COUPLE ────────────────────────────────
    {
      name: "Couple A",
      category: "Couple",
      price: 150000,
      description: "Sesi foto couple casual. 2 orang, durasi 30 menit. File digital.",
      isPackage: false,
      isAvailable: true,
    },
    {
      name: "Couple B",
      category: "Couple",
      price: 200000,
      description: "Sesi foto couple dengan 2 outfit. 2 orang, durasi 45 menit. File digital + cetak.",
      isPackage: false,
      isAvailable: true,
    },
    {
      name: "Couple C (Anniversary/Intimate)",
      category: "Couple",
      price: 400000,
      description: "Sesi intimate anniversary couple. 2 orang, full creative direction. File HD + cetak + frame.",
      isPackage: false,
      badge: "SPESIAL",
      isAvailable: true,
    },

    // ─── SINGLE & PAS FOTO ───────────────────────────
    {
      name: "Pas Foto (Formal)",
      category: "Pas Foto",
      price: 50000,
      description: "Pas foto formal: ijazah, SKCK, lamaran kerja, dll. Semua ukuran. File + cetak.",
      isPackage: false,
      isAvailable: true,
    },
    {
      name: "Single (Portofolio / Profil)",
      category: "Single",
      price: 100000,
      description: "Foto profil profesional LinkedIn, portofolio personal, atau konten sosial media.",
      isPackage: false,
      isAvailable: true,
    },

    // ─── ADD-ON / TAMBAHAN ────────────────────────────
    {
      name: "Tambah Orang — Graduation",
      category: "Add-On",
      price: 20000,
      description: "Biaya tambahan per orang untuk paket Graduation Standard atau Premium.",
      isPackage: false,
      isAvailable: true,
    },
    {
      name: "Tambah Orang — Photofox",
      category: "Add-On",
      price: 25000,
      description: "Biaya tambahan per orang untuk paket Photofox Self Photo Box.",
      isPackage: false,
      isAvailable: true,
    },
    {
      name: "Tambah Tema Background (Photofox)",
      category: "Add-On",
      price: 100000,
      description: "Tambah tema background berbeda untuk sesi Photofox.",
      isPackage: false,
      isAvailable: true,
    },
    {
      name: "Tambah Tema Background (Large Group)",
      category: "Add-On",
      price: 175000,
      description: "Tambah tema background berbeda untuk sesi Large Group.",
      isPackage: false,
      isAvailable: true,
    },

    // ─── PAKET BUNDLING SPESIAL ───────────────────────
    {
      name: "Paket Wisuda Lengkap",
      category: "Paket",
      price: 800000,
      description: "Graduation Premium + Pas Foto Formal + 1 sesi Couple. Paket one-stop wisuda terlengkap.",
      isPackage: true,
      packageItems: "1 Graduation Premium, 1 Pas Foto Formal, 1 Couple A",
      badge: "HEMAT 20%",
      isAvailable: true,
    },
    {
      name: "Paket Keluarga Wisuda",
      category: "Paket",
      price: 650000,
      description: "Graduation Standard + Family A. Abadikan momen wisuda bersama keluarga.",
      isPackage: true,
      packageItems: "1 Graduation Standard, 1 Family A",
      badge: "HEMAT",
      isAvailable: true,
    },
  ];

  // Insert semua produk ke database
  for (const product of foxeProducts) {
    await prisma.product.create({ data: product });
  }

  console.log(`✅ Selesai! ${foxeProducts.length} produk Foxe Studio berhasil di-seed ke database.`);
  console.log("📋 Produk yang dimasukkan:");
  foxeProducts.forEach((p) => {
    console.log(`   - ${p.name} (${p.category}) — Rp ${p.price.toLocaleString("id-ID")}`);
  });
}

main()
  .catch((e) => {
    console.error("❌ Seed gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
