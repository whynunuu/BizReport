import fs from "fs";
import path from "path";

// Load .env untuk script standalone bot
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

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import pino from "pino";
import { prisma } from "../src/lib/prisma";
import { analyzeLeadMessage } from "../src/lib/ai/lead-analyzer";
import { syncToGoogleSheets } from "../src/lib/services/sheets-sync";


const AUTH_FOLDER = path.join(process.cwd(), "auth_info_baileys");

async function startWhatsAppBot() {
  console.log("\n=======================================================");
  console.log("🟢 FOXE STUDIO - NATIVE WHATSAPP AI BOT LISTENER");
  console.log("=======================================================");
  console.log("Sedang memuat sesi WhatsApp lokal...\n");

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\n📱 SILAKAN SCAN QR CODE INI DI WHATSAPP KAMU:");
      console.log("   (Buka WhatsApp di HP -> Titik Tiga / Pengaturan -> Perangkat Tertaut -> Tautkan Perangkat)\n");
      qrcode.generate(qr, { small: true });
      console.log("\nMenunggu scan dari HP kamu...\n");
    }

    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(
        "Koneksi terputus karena:",
        lastDisconnect?.error,
        ", Mencoba konek ulang:",
        shouldReconnect
      );
      if (shouldReconnect) {
        startWhatsAppBot();
      }
    } else if (connection === "open") {
      console.log("\n✅ WHATSAPP BERHASIL TERHUBUNG!");
      console.log("Sistem AI CRM Foxe Studio sekarang standby memantau chat masuk secara real-time.\n");
    }
  });

  // Listener Pesan Masuk Real-Time
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      // Abaikan pesan yang dikirim dari diri sendiri atau pesan status/broadcast
      if (!msg.message || msg.key.fromMe || msg.key.remoteJid?.includes("@broadcast") || msg.key.remoteJid?.includes("@g.us")) {
        continue;
      }

      const remoteJid = msg.key.remoteJid || "";
      const rawNumber = remoteJid.replace(/[^0-9]/g, "");
      const senderName = msg.pushName || "Customer";

      // Ekstrak teks pesan
      const messageText =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        "";

      if (!messageText || messageText.trim() === "") continue;

      console.log("\n-------------------------------------------------------");
      console.log(`📩 CHAT MASUK BARU DARI: ${senderName} (${rawNumber})`);
      console.log(`💬 Isi Pesan: "${messageText}"`);
      console.log("-------------------------------------------------------");

      try {
        // 1. Cek / Buat Lead di Database Neon
        let lead = await prisma.lead.findUnique({
          where: { phoneNumber: rawNumber },
        });

        const isExistingLead = Boolean(lead);

        if (!lead) {
          lead = await prisma.lead.create({
            data: {
              phoneNumber: rawNumber,
              name: senderName,
              status: "NEW",
              source: "WHATSAPP",
            },
          });
        }

        // 2. Cek Admin Shift
        const activeAdmin = await prisma.adminShift.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        });

        // 3. Jalankan 2-Tier AI Engine
        console.log("🧠 Memproses pesan dengan AI...");
        const analysis = await analyzeLeadMessage({
          messageText,
          senderNumber: rawNumber,
          senderName: lead.name || senderName,
          isExistingLead,
          leadContext: lead.contextNotes,
          hasBooking: lead.hasBooking,
          lastBookingDate: lead.lastBookingDate,
          currentAdminShift: activeAdmin
            ? { adminName: activeAdmin.adminName, phoneNumber: activeAdmin.phoneNumber }
            : null,
        });

        console.log(`✨ Kategori : ${analysis.intentCategory} | Sentimen: ${analysis.sentiment} | Urgensi: ${analysis.urgencyScore}/5`);
        console.log(`💡 Ringkasan : ${analysis.summary}`);
        console.log(`📝 Draf Balasan:\n   "${analysis.recommendedReply}"`);

        // 4. Update Database Neon
        const combinedNotes = lead.contextNotes
          ? `${lead.contextNotes} | ${analysis.summary}`
          : analysis.summary;

        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            name: lead.name || analysis.extractedName || senderName,
            status: analysis.intentCategory === "BOOKING" ? "QUALIFIED" : (isExistingLead ? lead.status : "ENGAGED"),
            contextNotes: combinedNotes,
          },
        });

        const interaction = await prisma.leadInteraction.create({
          data: {
            leadId: lead.id,
            direction: "INBOUND",
            messageText,
            intentCategory: analysis.intentCategory,
            sentiment: analysis.sentiment,
            urgencyScore: analysis.urgencyScore,
            summary: analysis.summary,
            recommendedReply: analysis.recommendedReply,
            needsFollowUp: analysis.needsFollowUp,
            isHighPriority: analysis.isHighPriority,
            usedStrongAi: analysis.usedStrongAi,
            handledByAdmin: activeAdmin?.adminName || "Admin CS",
          },
        });

        console.log(`💾 Tersimpan di Neon DB (Interaction ID: ${interaction.id})`);

        // 5. Sinkronkan ke Google Sheets
        await syncToGoogleSheets({
          phoneNumber: rawNumber,
          name: lead.name || senderName,
          status: lead.status,
          intentCategory: analysis.intentCategory,
          sentiment: analysis.sentiment,
          urgencyScore: analysis.urgencyScore,
          summary: analysis.summary,
          messageText,
          needsFollowUp: analysis.needsFollowUp,
          isHighPriority: analysis.isHighPriority,
          handledByAdmin: activeAdmin?.adminName || "Admin CS",
          timestamp: new Date().toISOString(),
        });

        // 6. Jika Prioritas Tinggi -> Kirim Notifikasi ke Admin via WhatsApp
        if (analysis.isHighPriority && activeAdmin?.phoneNumber) {
          let adminJid = activeAdmin.phoneNumber.replace(/[^0-9]/g, "");
          if (adminJid.startsWith("08")) adminJid = "628" + adminJid.slice(2);
          adminJid = `${adminJid}@s.whatsapp.net`;

          const alertMsg = `🚨 *[ALERT LEAD PRIORITAS TINGGI]*
Ada pesan masuk yang butuh penanganan segera!

👤 *Pengirim:* ${lead.name || senderName} (${rawNumber})
📌 *Kategori:* ${analysis.intentCategory} (Urgensi: ${analysis.urgencyScore}/5)
📝 *Ringkasan:* ${analysis.summary}

💡 *Rekomendasi Balasan:*
"${analysis.recommendedReply}"`;

          console.log(`🚨 Mengirim notifikasi prioritas tinggi ke admin (${activeAdmin.adminName})...`);
          await sock.sendMessage(adminJid, { text: alertMsg });
        }
      } catch (err) {
        console.error("Error memproses chat WhatsApp:", err);
      }
    }
  });
}

startWhatsAppBot().catch((err) => {
  console.error("Gagal menjalankan WhatsApp Bot:", err);
});
