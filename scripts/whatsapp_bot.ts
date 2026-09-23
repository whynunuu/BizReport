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
  downloadMediaMessage,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import pino from "pino";
import { prisma } from "../src/lib/prisma";
import { analyzeLeadMessage } from "../src/lib/ai/lead-analyzer";
import { analyzePaymentReceipt } from "../src/lib/ai/receipt-analyzer";
import { syncToGoogleSheets } from "../src/lib/services/sheets-sync";
import { determineActiveShift, formatCsReplyWithSignature } from "../src/lib/services/admin-shift-service";


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

      // Ekstrak teks pesan atau gambar
      const isImage = Boolean(msg.message.imageMessage);
      const messageText =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        (isImage ? "[Foto Bukti Transfer / Media]" : "");

      if (!messageText || messageText.trim() === "") continue;

      console.log("\n-------------------------------------------------------");
      console.log(`📩 CHAT MASUK BARU DARI: ${senderName} (${rawNumber}) ${isImage ? "[Disertai Foto Media]" : ""}`);
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

        // 2. Cek Admin Shift (Admin 1: 09-15 / Admin 2: 15-21 atau hashtag)
        const activeShift = await determineActiveShift(messageText);
        const activeAdmin = {
          adminName: activeShift.adminName,
          phoneNumber: activeShift.phoneNumber,
        };

        // 3. JIKA ADA FOTO: Cek apakah Bukti Transfer Sah via Gemini Vision OCR
        let verifiedReceipt = null;
        if (isImage) {
          console.log("📸 Mengunduh dan menganalisis foto bukti transfer dengan Gemini Vision AI...");
          try {
            const buffer = (await downloadMediaMessage(msg, "buffer", {})) as Buffer;
            if (buffer && buffer.length > 0) {
              const imageBase64 = buffer.toString("base64");
              verifiedReceipt = await analyzePaymentReceipt({
                imageBase64,
                captionText: messageText,
                clientName: lead.name || senderName,
              });
            }
          } catch (imgErr) {
            console.warn("Gagal mengunduh media Baileys:", imgErr);
          }
        }

        // 4. JIKA STRUK TRANSFER SAH TERKONFIRMASI:
        if (verifiedReceipt && verifiedReceipt.isPaymentReceipt && verifiedReceipt.isSuccess) {
          console.log(`🎉 BUKTI TRANSFER SAH: ${verifiedReceipt.bankName} Rp ${verifiedReceipt.amount}`);
          const clientDisplayName = lead.name || (verifiedReceipt.senderName !== "-" ? verifiedReceipt.senderName : senderName);
          const updatedRevenue = (lead.revenue || 0) + (verifiedReceipt.amount > 0 ? verifiedReceipt.amount : 0);
          const noteText = `[STRUK TRANSFER SAH] ${verifiedReceipt.bankName} Rp ${verifiedReceipt.amount.toLocaleString("id-ID")} (Ref: ${verifiedReceipt.referenceNumber}) | ${verifiedReceipt.summary}`;

          await prisma.lead.update({
            where: { id: lead.id },
            data: {
              name: clientDisplayName,
              status: "BOOKING",
              hasBooking: true,
              lastBookingDate: new Date(),
              bookingNotes: `Lunas/DP via ${verifiedReceipt.bankName} Rp ${verifiedReceipt.amount.toLocaleString("id-ID")}`,
              revenue: updatedRevenue,
              contextNotes: lead.contextNotes ? `${lead.contextNotes} | ${noteText}` : noteText,
              leadScore: 100,
              temperature: "HOT",
              closingAdmin: activeShift.adminName,
              followUpDate: null,
            },
          });

          const signedReceiptReply = formatCsReplyWithSignature(
            verifiedReceipt.suggestedConfirmationReply,
            activeShift.adminName
          );

          const interaction = await prisma.leadInteraction.create({
            data: {
              leadId: lead.id,
              direction: "INBOUND",
              messageText: `${messageText} [Foto Struk Transfer Terverifikasi]`,
              intentCategory: "BOOKING",
              sentiment: "POSITIF",
              urgencyScore: 5,
              leadScore: 100,
              temperature: "HOT",
              ruleSignals: `PAYMENT_RECEIPT_VERIFIED, ${verifiedReceipt.bankName}, NOMINAL_${verifiedReceipt.amount}, CS_${activeShift.adminName}`,
              summary: `[STRUK SAH] Transfer via ${verifiedReceipt.bankName} Rp ${verifiedReceipt.amount.toLocaleString("id-ID")}. ${verifiedReceipt.summary}`,
              recommendedReply: signedReceiptReply,
              suggestedAction: "Verifikasi rekening masuk dan kirim konfirmasi booking resmi & jadwal foto.",
              needsFollowUp: false,
              isHighPriority: true,
              usedStrongAi: true,
              handledByAdmin: activeShift.adminName,
            },
          });

          await syncToGoogleSheets({
            phoneNumber: rawNumber,
            name: clientDisplayName,
            status: "BOOKING",
            intentCategory: "BOOKING",
            sentiment: "POSITIF",
            urgencyScore: 5,
            summary: `[STRUK SAH] Rp ${verifiedReceipt.amount.toLocaleString("id-ID")} via ${verifiedReceipt.bankName}`,
            recommendedReply: verifiedReceipt.suggestedConfirmationReply,
            messageText,
            needsFollowUp: false,
            isHighPriority: true,
            handledByAdmin: activeAdmin?.adminName || "Admin CS",
            timestamp: new Date().toISOString(),
          });

          if (activeAdmin?.phoneNumber) {
            let adminJid = activeAdmin.phoneNumber.replace(/[^0-9]/g, "");
            if (adminJid.startsWith("08")) adminJid = "628" + adminJid.slice(2);
            adminJid = `${adminJid}@s.whatsapp.net`;

            const alertMsg = `🎉 *[PEMBAYARAN DP/LUNAS TERVERIFIKASI]*
Customer baru saja mengirim bukti transfer sah!

👤 *Customer:* ${clientDisplayName} (${rawNumber})
🏦 *Bank:* ${verifiedReceipt.bankName}
💰 *Nominal:* Rp ${verifiedReceipt.amount.toLocaleString("id-ID")}
🔖 *No. Ref:* ${verifiedReceipt.referenceNumber}

💡 *Draf Balasan Konfirmasi CS:*
"${verifiedReceipt.suggestedConfirmationReply}"`;

            await sock.sendMessage(adminJid, { text: alertMsg });
          }

          continue;
        }

        // 5. Jalankan 2-Tier AI Engine jika bukan bukti transfer
        console.log("🧠 Memproses pesan teks dengan AI...");
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

        // Format balasan dengan tanda tangan hashtag CS (#Admin1 atau #Admin2)
        const signedStandardReply = formatCsReplyWithSignature(
          analysis.recommendedReply,
          activeShift.adminName
        );

        console.log(`✨ Kategori : ${analysis.intentCategory} | Sentimen: ${analysis.sentiment} | Urgensi: ${analysis.urgencyScore}/5`);
        console.log(`💡 Ringkasan : ${analysis.summary}`);
        console.log(`📝 Draf Balasan:\n   "${signedStandardReply}"`);

        // 6. Update Database Neon
        const combinedNotes = lead.contextNotes
          ? `${lead.contextNotes} | ${analysis.summary}`
          : analysis.summary;

        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            name: lead.name || analysis.extractedName || senderName,
            status: analysis.intentCategory === "BOOKING" ? "QUALIFIED" : (isExistingLead ? lead.status : "ENGAGED"),
            contextNotes: combinedNotes,
            leadOwner: lead.leadOwner || activeShift.adminName,
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
            recommendedReply: signedStandardReply,
            needsFollowUp: analysis.needsFollowUp,
            isHighPriority: analysis.isHighPriority,
            usedStrongAi: analysis.usedStrongAi,
            handledByAdmin: activeShift.adminName,
          },
        });

        console.log(`💾 Tersimpan di Neon DB (Interaction ID: ${interaction.id})`);

        // 7. Sinkronkan ke Google Sheets
        await syncToGoogleSheets({
          phoneNumber: rawNumber,
          name: lead.name || senderName,
          status: lead.status,
          intentCategory: analysis.intentCategory,
          sentiment: analysis.sentiment,
          urgencyScore: analysis.urgencyScore,
          summary: analysis.summary,
          recommendedReply: signedStandardReply,
          messageText,
          needsFollowUp: analysis.needsFollowUp,
          isHighPriority: analysis.isHighPriority,
          handledByAdmin: activeShift.adminName,
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
