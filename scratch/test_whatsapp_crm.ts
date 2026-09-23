import fs from "fs";
import path from "path";

// Load .env untuk script standalone tsx
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [k, ...v] = trimmed.split("=");
      process.env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
}

import { prisma } from "../src/lib/prisma";
import { analyzeLeadMessage } from "../src/lib/ai/lead-analyzer";
import { sendWhatsAppMessage } from "../src/lib/services/whatsapp-service";
import { syncToGoogleSheets } from "../src/lib/services/sheets-sync";


async function runSimulation() {
  console.log("==================================================");
  console.log("🚀 MEMULAI SIMULASI WORKFLOW WHATSAPP AI CRM");
  console.log("==================================================\n");

  // 1. Setup Admin Shift Dummy jika belum ada
  let admin = await prisma.adminShift.findFirst({ where: { isActive: true } });
  if (!admin) {
    admin = await prisma.adminShift.create({
      data: {
        adminName: "Kak Cindy (CS On-Duty)",
        phoneNumber: "081299998888",
        shiftDay: "SETIAP_HARI",
        startTime: "08:00",
        endTime: "22:00",
        isActive: true,
      },
    });
    console.log("✅ Admin Shift Terdaftar:", admin.adminName);
  } else {
    console.log("✅ Admin Shift Aktif Ditemukan:", admin.adminName);
  }

  // 2. Simulasi Pesan 1: Lead Baru - Tanya Booking Wisuda
  const testNumber1 = "6285712345678";
  const testMessage1 = "Halo kak, aku mau tanya pricelist foto wisuda studio untuk 5 orang tanggal 25 bulan depan apakah ada slot kosong?";

  console.log("\n--------------------------------------------------");
  console.log("📩 SIMULASI PESAN 1 (Pricelist & Booking)");
  console.log(`Pengirim: ${testNumber1}`);
  console.log(`Pesan: "${testMessage1}"`);
  console.log("--------------------------------------------------");

  // Proses AI
  const analysis1 = await analyzeLeadMessage({
    messageText: testMessage1,
    senderNumber: testNumber1,
    isExistingLead: false,
    currentAdminShift: { adminName: admin.adminName, phoneNumber: admin.phoneNumber },
  });

  console.log("\n🧠 HASIL ANALISIS AI (Tier 1 / Tier 2):");
  console.log("- Kategori Niat :", analysis1.intentCategory);
  console.log("- Sentimen       :", analysis1.sentiment);
  console.log("- Skor Urgensi  :", `${analysis1.urgencyScore}/5`);
  console.log("- Butuh FollowUp:", analysis1.needsFollowUp ? "YA" : "TIDAK");
  console.log("- Prioritas     :", analysis1.isHighPriority ? "TINGGI 🔥" : "NORMAL");
  console.log("- Model Digunakan:", analysis1.usedStrongAi ? "Tier 2 (Pro)" : "Tier 1 (Flash)");
  console.log("- Ringkasan AI  :", analysis1.summary);
  console.log("- Draf Balasan  :\n  ", `"${analysis1.recommendedReply}"`);

  // Simpan ke DB
  let lead1 = await prisma.lead.upsert({
    where: { phoneNumber: testNumber1 },
    update: {
      status: "QUALIFIED",
      contextNotes: analysis1.summary,
    },
    create: {
      phoneNumber: testNumber1,
      name: analysis1.extractedName || "Calon Klien Wisuda",
      status: "QUALIFIED",
      contextNotes: analysis1.summary,
    },
  });

  const interaction1 = await prisma.leadInteraction.create({
    data: {
      leadId: lead1.id,
      direction: "INBOUND",
      messageText: testMessage1,
      intentCategory: analysis1.intentCategory,
      sentiment: analysis1.sentiment,
      urgencyScore: analysis1.urgencyScore,
      summary: analysis1.summary,
      recommendedReply: analysis1.recommendedReply,
      needsFollowUp: analysis1.needsFollowUp,
      isHighPriority: analysis1.isHighPriority,
      usedStrongAi: analysis1.usedStrongAi,
      handledByAdmin: admin.adminName,
    },
  });
  console.log(`\n💾 Tersimpan di Neon DB: Lead ID (${lead1.id}), Interaction ID (${interaction1.id})`);

  // Sync Sheets
  await syncToGoogleSheets({
    phoneNumber: testNumber1,
    name: lead1.name,
    status: lead1.status,
    intentCategory: analysis1.intentCategory,
    sentiment: analysis1.sentiment,
    urgencyScore: analysis1.urgencyScore,
    summary: analysis1.summary,
    messageText: testMessage1,
    needsFollowUp: analysis1.needsFollowUp,
    isHighPriority: analysis1.isHighPriority,
    handledByAdmin: admin.adminName,
    timestamp: new Date().toISOString(),
  });

  // Jika Prioritas Tinggi -> Alert WA
  if (analysis1.isHighPriority) {
    await sendWhatsAppMessage({
      target: admin.phoneNumber,
      message: `🚨 *[ALERT LEAD PRIORITAS TINGGI]*\nPengirim: ${testNumber1}\nKategori: ${analysis1.intentCategory}\nRingkasan: ${analysis1.summary}`,
    });
  }

  // 3. Simulasi Pesan 2: Komplain Mendesak (Urgensi Tinggi)
  const testNumber2 = "6281987654321";
  const testMessage2 = "Halo kak tolong direspon segera, file foto saya yang kemarin kenapa belum dikirim ya? Besok pagi sudah harus saya cetak untuk acara penting!";

  console.log("\n--------------------------------------------------");
  console.log("📩 SIMULASI PESAN 2 (Komplain Mendesak)");
  console.log(`Pengirim: ${testNumber2}`);
  console.log(`Pesan: "${testMessage2}"`);
  console.log("--------------------------------------------------");

  const analysis2 = await analyzeLeadMessage({
    messageText: testMessage2,
    senderNumber: testNumber2,
    isExistingLead: true,
    currentAdminShift: { adminName: admin.adminName, phoneNumber: admin.phoneNumber },
  });

  console.log("\n🧠 HASIL ANALISIS AI (Tier 1 / Tier 2):");
  console.log("- Kategori Niat :", analysis2.intentCategory);
  console.log("- Sentimen       :", analysis2.sentiment);
  console.log("- Skor Urgensi  :", `${analysis2.urgencyScore}/5`);
  console.log("- Butuh FollowUp:", analysis2.needsFollowUp ? "YA" : "TIDAK");
  console.log("- Prioritas     :", analysis2.isHighPriority ? "TINGGI 🔥" : "NORMAL");
  console.log("- Draf Balasan  :\n  ", `"${analysis2.recommendedReply}"`);

  // Jika Prioritas Tinggi -> Alert WhatsApp ke Admin
  if (analysis2.isHighPriority) {
    console.log("\n🚨 MENGIRIM ALERT WHATSAPP KE NOMOR ADMIN ON-DUTY...");
    await sendWhatsAppMessage({
      target: admin.phoneNumber,
      message: `🚨 *[ALERT LEAD PRIORITAS TINGGI]*\nPengirim: ${testNumber2}\nKategori: ${analysis2.intentCategory} (${analysis2.urgencyScore}/5)\nRingkasan: ${analysis2.summary}\n\nDraf Balasan:\n"${analysis2.recommendedReply}"`,
    });
  }

  console.log("\n==================================================");
  console.log("🎉 SELURUH SIMULASI END-TO-END SELESAI!");
  console.log("==================================================");
}


runSimulation()
  .catch((err) => {
    console.error("Simulation error:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
