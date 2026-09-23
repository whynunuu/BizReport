import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeLeadMessage } from "@/lib/ai/lead-analyzer";
import { analyzePaymentReceipt } from "@/lib/ai/receipt-analyzer";
import { sendWhatsAppMessage } from "@/lib/services/whatsapp-service";
import { syncToGoogleSheets } from "@/lib/services/sheets-sync";
import { determineActiveShift, formatCsReplyWithSignature } from "@/lib/services/admin-shift-service";

interface ExtractedPayload {
  senderNumber: string;
  messageText: string;
  senderName?: string;
  mediaUrl?: string;
  imageBase64?: string;
}

/**
 * Adapter untuk mengekstrak data dari berbagai macam WhatsApp Gateway (Fonnte, WAHA, Meta, atau Simulator)
 */
function extractMessagePayload(body: Record<string, unknown>): ExtractedPayload {
  let mediaUrl: string | undefined = undefined;
  let imageBase64: string | undefined = undefined;

  if (typeof body.base64 === "string") {
    imageBase64 = body.base64;
  } else if (typeof body.imageBase64 === "string") {
    imageBase64 = body.imageBase64;
  }

  if (typeof body.url === "string" && body.url.startsWith("http")) {
    mediaUrl = body.url;
  } else if (typeof body.file === "string" && body.file.startsWith("http")) {
    mediaUrl = body.file;
  } else if (typeof body.image === "string" && body.image.startsWith("http")) {
    mediaUrl = body.image;
  } else if (typeof body.mediaUrl === "string" && body.mediaUrl.startsWith("http")) {
    mediaUrl = body.mediaUrl;
  } else if (typeof body.imageUrl === "string" && body.imageUrl.startsWith("http")) {
    mediaUrl = body.imageUrl;
  }

  // Format 1: Fonnte ({ sender: "628123...", message: "...", name: "...", url: "..." })
  if (body.sender && (body.message || mediaUrl || imageBase64)) {
    return {
      senderNumber: String(body.sender),
      messageText: String(body.message || (mediaUrl || imageBase64 ? "[Bukti Pembayaran / Foto Media]" : "")),
      senderName: typeof body.name === "string" ? body.name : undefined,
      mediaUrl,
      imageBase64,
    };
  }

  // Format 2: WAHA ({ event: "message", payload: { from: "...@c.us", body: "...", media: { url: "..." } } })
  if (body.event === "message" && typeof body.payload === "object" && body.payload !== null) {
    const payload = body.payload as Record<string, unknown>;
    const from = String(payload.from || "").replace("@c.us", "").replace("@s.whatsapp.net", "");
    const rawData = payload._data as Record<string, unknown> | undefined;
    const wahaMedia = payload.media as Record<string, unknown> | undefined;
    const extractedMedia =
      (typeof wahaMedia?.url === "string" ? wahaMedia.url : undefined) ||
      (typeof payload.url === "string" ? payload.url : undefined) ||
      mediaUrl;

    return {
      senderNumber: from,
      messageText: String(payload.body || (extractedMedia || imageBase64 ? "[Bukti Pembayaran / Foto Media]" : "")),
      senderName: (typeof rawData?.notifyName === "string" ? rawData.notifyName : undefined) || (typeof payload.pushname === "string" ? payload.pushname : undefined),
      mediaUrl: extractedMedia,
      imageBase64,
    };
  }

  // Format 3: Standar Generic / Simulator ({ phone, text, name, mediaUrl, base64 })
  const senderNumber = String(body.phoneNumber || body.phone || body.from || "");
  const messageText = String(body.messageText || body.text || body.message || (mediaUrl || imageBase64 ? "[Bukti Pembayaran / Foto Media]" : ""));
  const senderName =
    typeof body.senderName === "string"
      ? body.senderName
      : typeof body.name === "string"
      ? body.name
      : undefined;

  return { senderNumber, messageText, senderName, mediaUrl, imageBase64 };
}

/**
 * Normalisasi nomor telepon ke format internasional Indonesia tanpa karakter khusus
 */
function normalizePhoneNumber(phone: string): string {
  let clean = phone.replace(/[^0-9]/g, "");
  if (clean.startsWith("08")) {
    clean = "628" + clean.slice(2);
  }
  return clean;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const { senderNumber: rawNumber, messageText, senderName, mediaUrl, imageBase64 } = extractMessagePayload(rawBody);

    if (!rawNumber || (!messageText && !mediaUrl && !imageBase64)) {
      return NextResponse.json(
        { error: "Payload tidak valid. Membutuhkan nomor pengirim dan teks pesan atau media." },
        { status: 400 }
      );
    }

    const cleanNumber = normalizePhoneNumber(rawNumber);

    console.log(`[WhatsAppWebhook] Pesan masuk dari ${cleanNumber}: "${messageText.slice(0, 50)}..." ${mediaUrl ? `(Media: ${mediaUrl})` : ""}`);

    // 1. Cek Shift Admin yang sedang bertugas saat ini (Admin 1: 09-15 / Admin 2: 15-21 atau override hashtag)
    const activeShift = await determineActiveShift(messageText);
    const activeAdmin = {
      adminName: activeShift.adminName,
      phoneNumber: activeShift.phoneNumber,
    };

    // 2. Cari / Upsert Lead di Database Neon
    let lead = await prisma.lead.findUnique({
      where: { phoneNumber: cleanNumber },
    });

    const isExistingLead = Boolean(lead);

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          phoneNumber: cleanNumber,
          name: senderName || null,
          status: "NEW",
          source: "WHATSAPP",
          leadOwner: activeShift.adminName,
        },
      });
      console.log(`[WhatsAppWebhook] Lead baru dibuat di database: ${lead.id} (Owner: ${activeShift.adminName})`);
    }

    // 3. JIKA ADA MEDIA / FOTO: Cek apakah ini Bukti Transfer Pembayaran menggunakan Gemini Vision OCR
    let verifiedReceipt = null;
    if (mediaUrl || imageBase64) {
      console.log(`[WhatsAppWebhook] Mendeteksi media foto masuk dari ${cleanNumber}, memulai verifikasi bukti transfer AI...`);
      verifiedReceipt = await analyzePaymentReceipt({
        imageUrl: mediaUrl,
        imageBase64,
        captionText: messageText,
        clientName: lead.name || senderName,
      });
    }

    // 4. JIKA BUKTI TRANSFER SAH TERVERIFIKASI:
    if (verifiedReceipt && verifiedReceipt.isPaymentReceipt && verifiedReceipt.isSuccess) {
      console.log(`[WhatsAppWebhook] 🎉 BUKTI TRANSFER SAH TERVERIFIKASI: Bank ${verifiedReceipt.bankName} Rp ${verifiedReceipt.amount}`);

      const clientDisplayName = lead.name || (verifiedReceipt.senderName !== "-" ? verifiedReceipt.senderName : senderName) || "Customer";
      const updatedRevenue = (lead.revenue || 0) + (verifiedReceipt.amount > 0 ? verifiedReceipt.amount : 0);
      const noteText = `[STRUK TRANSFER SAH] ${verifiedReceipt.bankName} Rp ${verifiedReceipt.amount.toLocaleString("id-ID")} (Ref: ${verifiedReceipt.referenceNumber}) | ${verifiedReceipt.summary}`;
      const combinedNotes = lead.contextNotes
        ? `${lead.contextNotes} | ${noteText}`
        : noteText;

      // Update Lead jadi BOOKING / CONVERTED
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          name: clientDisplayName,
          status: "BOOKING",
          hasBooking: true,
          lastBookingDate: new Date(),
          bookingNotes: `${verifiedReceipt.paymentType === "DP" ? "DP" : "Pelunasan"} via ${verifiedReceipt.bankName} Rp ${verifiedReceipt.amount.toLocaleString("id-ID")}`,
          revenue: updatedRevenue,
          contextNotes: combinedNotes,
          leadScore: 100,
          temperature: "HOT",
          closingAdmin: activeShift.adminName,
          followUpDate: null, // Selesai / closing konversi berhasil, stop follow up
        },
      });

      // Format balasan konfirmasi dengan hashtag tanda tangan CS (misal: #Admin1 atau #Admin2)
      const signedConfirmationReply = formatCsReplyWithSignature(
        verifiedReceipt.suggestedConfirmationReply,
        activeShift.adminName
      );

      // Catat Interaksi Verifikasi Bukti Pembayaran
      const fullMessageText = mediaUrl
        ? `${messageText} [Foto Bukti Transfer: ${mediaUrl}]`
        : `${messageText} [Foto Bukti Transfer Terlampir]`;

      const interaction = await prisma.leadInteraction.create({
        data: {
          leadId: lead.id,
          direction: "INBOUND",
          messageText: fullMessageText,
          intentCategory: "BOOKING",
          sentiment: "POSITIF",
          urgencyScore: 5,
          leadScore: 100,
          temperature: "HOT",
          ruleSignals: `PAYMENT_RECEIPT_VERIFIED, ${verifiedReceipt.bankName}, NOMINAL_${verifiedReceipt.amount}, CS_${activeShift.adminName}`,
          summary: `[STRUK SAH TERVERIFIKASI] Transfer via ${verifiedReceipt.bankName} Rp ${verifiedReceipt.amount.toLocaleString("id-ID")}. ${verifiedReceipt.summary}`,
          recommendedReply: signedConfirmationReply,
          suggestedAction: "Verifikasi mutasi rekening masuk dan kirim konfirmasi booking resmi & slot jadwal foto ke customer.",
          priorityReason: `Pembayaran DP/Lunas terkonfirmasi sah via AI Vision (${verifiedReceipt.bankName} Rp ${verifiedReceipt.amount.toLocaleString("id-ID")})`,
          followUpReason: "Pembayaran telah terkonfirmasi (Booking Sukses)",
          followUpDueDate: null,
          aiConfidence: verifiedReceipt.confidenceScore,
          needsFollowUp: false,
          followUpStatus: "COMPLETED",
          isHighPriority: true,
          usedStrongAi: true,
          handledByAdmin: activeShift.adminName,
        },
      });

      // Sinkronisasi ke Google Sheets
      await syncToGoogleSheets({
        phoneNumber: cleanNumber,
        name: clientDisplayName,
        status: "BOOKING",
        intentCategory: "BOOKING",
        sentiment: "POSITIF",
        urgencyScore: 5,
        leadScore: 100,
        temperature: "HOT",
        ruleSignals: `PAYMENT_RECEIPT_VERIFIED, ${verifiedReceipt.bankName}`,
        summary: `[PEMBAYARAN SAH] Rp ${verifiedReceipt.amount.toLocaleString("id-ID")} via ${verifiedReceipt.bankName}. Ref: ${verifiedReceipt.referenceNumber}`,
        recommendedReply: signedConfirmationReply,
        suggestedAction: "Verifikasi mutasi rekening & kirim jadwal sesi foto",
        messageText: fullMessageText,
        needsFollowUp: false,
        isHighPriority: true,
        handledByAdmin: activeShift.adminName,
        timestamp: new Date().toISOString(),
      });

      // Kirim Alert Notifikasi WhatsApp ke Admin Shift Bertugas
      if (activeAdmin?.phoneNumber) {
        const alertMsg = `🎉 *[PEMBAYARAN DP/LUNAS TERVERIFIKASI - FOXE STUDIO]*
Pelanggan baru saja mengirim bukti transfer sah!

👤 *Customer:* ${clientDisplayName} (${cleanNumber})
🏦 *Bank:* ${verifiedReceipt.bankName}
💰 *Nominal:* Rp ${verifiedReceipt.amount.toLocaleString("id-ID")}
📋 *Nama di Struk:* ${verifiedReceipt.senderName}
🔖 *No. Ref:* ${verifiedReceipt.referenceNumber}
📅 *Waktu Transaksi:* ${verifiedReceipt.transactionDate}

💡 *Draf Balasan Konfirmasi CS (Human-in-the-loop):*
"${verifiedReceipt.suggestedConfirmationReply}"

🔗 *Buka CRM untuk detail:* https://foxe-studio-id.vercel.app/crm`;

        await sendWhatsAppMessage({
          target: activeAdmin.phoneNumber,
          message: alertMsg,
        });
      }

      return NextResponse.json({
        status: "success",
        type: "PAYMENT_RECEIPT_VERIFIED",
        leadId: lead.id,
        interactionId: interaction.id,
        receipt: verifiedReceipt,
        leadStatus: "BOOKING",
        revenue: updatedRevenue,
      });
    }

    // 5. JIKA BUKAN BUKTI TRANSFER (Chat Teks Biasa atau Foto Referensi / Pose)
    const effectiveMessageText = mediaUrl
      ? `${messageText} [Lampiran Media: ${mediaUrl}]`
      : messageText;

    // Jalankan 2-Tier AI Engine (Gemini Flash -> Gemini Pro jika perlu eskalasi)
    const analysis = await analyzeLeadMessage({
      messageText: effectiveMessageText,
      senderNumber: cleanNumber,
      senderName: lead.name || senderName,
      isExistingLead,
      leadContext: lead.contextNotes,
      hasBooking: lead.hasBooking,
      lastBookingDate: lead.lastBookingDate,
      currentAdminShift: activeAdmin
        ? { adminName: activeAdmin.adminName, phoneNumber: activeAdmin.phoneNumber }
        : null,
    });

    // 6. Update profil Lead berdasarkan temuan AI (Lead Owner, Score, Suhu)
    const updatedName = lead.name || analysis.extractedName || senderName;
    const combinedNotes = lead.contextNotes
      ? `${lead.contextNotes} | ${analysis.updatedContextNotes || analysis.summary}`
      : (analysis.updatedContextNotes || analysis.summary);

    const followUpDueDate = new Date(Date.now() + analysis.followUpDays * 86400000);

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        name: updatedName,
        status: analysis.intentCategory === "BOOKING" ? "QUALIFIED" : (isExistingLead ? lead.status : "ENGAGED"),
        contextNotes: combinedNotes,
        leadOwner: lead.leadOwner || activeShift.adminName,
        leadScore: analysis.leadScore,
        temperature: analysis.temperature,
        followUpDate: followUpDueDate,
      },
    });

    // Format balasan dengan tanda tangan hashtag CS (#Admin1 atau #Admin2)
    const signedStandardReply = formatCsReplyWithSignature(
      analysis.recommendedReply,
      activeShift.adminName
    );

    // 7. Catat Interaksi Lengkap ke Database Neon
    const interaction = await prisma.leadInteraction.create({
      data: {
        leadId: lead.id,
        direction: "INBOUND",
        messageText: effectiveMessageText,
        intentCategory: analysis.intentCategory,
        sentiment: analysis.sentiment,
        urgencyScore: analysis.urgencyScore,
        leadScore: analysis.leadScore,
        temperature: analysis.temperature,
        ruleSignals: analysis.ruleSignals.length > 0 ? analysis.ruleSignals.join(", ") : null,
        summary: analysis.summary,
        recommendedReply: signedStandardReply,
        suggestedAction: analysis.suggestedAction,
        priorityReason: analysis.priorityReason,
        followUpReason: analysis.followUpReason,
        followUpDueDate: followUpDueDate,
        aiConfidence: analysis.aiConfidence,
        needsFollowUp: analysis.needsFollowUp,
        isHighPriority: analysis.isHighPriority,
        usedStrongAi: analysis.usedStrongAi,
        handledByAdmin: activeShift.adminName,
      },
    });

    // 8. Sinkronisasi Baris Baru ke Google Sheets
    await syncToGoogleSheets({
      phoneNumber: cleanNumber,
      name: updatedName,
      status: lead.status,
      intentCategory: analysis.intentCategory,
      sentiment: analysis.sentiment,
      urgencyScore: analysis.urgencyScore,
      leadScore: analysis.leadScore,
      temperature: analysis.temperature,
      ruleSignals: analysis.ruleSignals.join(", "),
      summary: analysis.summary,
      recommendedReply: signedStandardReply,
      suggestedAction: analysis.suggestedAction,
      messageText: effectiveMessageText,
      needsFollowUp: analysis.needsFollowUp,
      isHighPriority: analysis.isHighPriority,
      handledByAdmin: activeShift.adminName,
      timestamp: new Date().toISOString(),
    });

    // 9. Jika Prioritas Tinggi -> Kirim Notifikasi WhatsApp Alert ke Admin Bertugas
    if (analysis.isHighPriority && activeAdmin?.phoneNumber) {
      const alertMsg = `🚨 *[ALERT LEAD PRIORITAS TINGGI]*
Ada pesan masuk yang membutuhkan respon segera!

👤 *Pengirim:* ${updatedName || "Customer"} (${cleanNumber})
📌 *Kategori:* ${analysis.intentCategory}
⚡ *Urgensi:* ${analysis.urgencyScore}/5 (${analysis.sentiment})
📝 *Ringkasan:* ${analysis.summary}

💡 *Rekomendasi Balasan:*
"${analysis.recommendedReply}"

_Mohon segera dicek dan ditindaklanjuti ya kak!_`;

      await sendWhatsAppMessage({
        target: activeAdmin.phoneNumber,
        message: alertMsg,
      });
    }

    return NextResponse.json({
      status: "success",
      leadId: lead.id,
      interactionId: interaction.id,
      analysis,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[WhatsAppWebhook] Gagal memproses pesan:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: errMsg },
      { status: 500 }
    );
  }
}


export async function GET() {
  return NextResponse.json({
    status: "active",
    service: "WhatsApp AI CRM Webhook Service",
    timestamp: new Date().toISOString(),
  });
}
