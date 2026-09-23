import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeLeadMessage } from "@/lib/ai/lead-analyzer";
import { sendWhatsAppMessage } from "@/lib/services/whatsapp-service";
import { syncToGoogleSheets } from "@/lib/services/sheets-sync";

/**
 * Adapter untuk mengekstrak data dari berbagai macam WhatsApp Gateway (Fonnte, WAHA, Meta, atau Simulator)
 */
function extractMessagePayload(body: Record<string, unknown>): { senderNumber: string; messageText: string; senderName?: string } {
  // Format 1: Fonnte ({ sender: "628123...", message: "...", name: "..." })
  if (body.sender && body.message) {
    return {
      senderNumber: String(body.sender),
      messageText: String(body.message),
      senderName: typeof body.name === "string" ? body.name : undefined,
    };
  }

  // Format 2: WAHA ({ event: "message", payload: { from: "...@c.us", body: "..." } })
  if (body.event === "message" && typeof body.payload === "object" && body.payload !== null) {
    const payload = body.payload as Record<string, unknown>;
    const from = String(payload.from || "").replace("@c.us", "").replace("@s.whatsapp.net", "");
    const rawData = payload._data as Record<string, unknown> | undefined;
    return {
      senderNumber: from,
      messageText: String(payload.body || ""),
      senderName: (typeof rawData?.notifyName === "string" ? rawData.notifyName : undefined) || (typeof payload.pushname === "string" ? payload.pushname : undefined),
    };
  }


  // Format 3: Standar Generic / Simulator ({ phone, text, name })
  const senderNumber = String(body.phoneNumber || body.phone || body.from || "");
  const messageText = String(body.messageText || body.text || body.message || "");
  const senderName =
    typeof body.senderName === "string"
      ? body.senderName
      : typeof body.name === "string"
      ? body.name
      : undefined;

  return { senderNumber, messageText, senderName };
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
    const { senderNumber: rawNumber, messageText, senderName } = extractMessagePayload(rawBody);

    if (!rawNumber || !messageText) {
      return NextResponse.json(
        { error: "Payload tidak valid. Membutuhkan nomor pengirim dan teks pesan." },
        { status: 400 }
      );
    }

    const cleanNumber = normalizePhoneNumber(rawNumber);

    console.log(`[WhatsAppWebhook] Pesan masuk dari ${cleanNumber}: "${messageText.slice(0, 50)}..."`);

    // 1. Cek Shift Admin yang sedang bertugas saat ini
    const activeAdmin = await prisma.adminShift.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

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
        },
      });
      console.log(`[WhatsAppWebhook] Lead baru dibuat di database: ${lead.id}`);
    }

    // 3. Jalankan 2-Tier AI Engine (Gemini Flash -> Gemini Pro jika perlu eskalasi)
    const analysis = await analyzeLeadMessage({
      messageText,
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

    // 4. Update profil Lead berdasarkan temuan AI (Lead Owner, Score, Suhu)
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
        leadOwner: lead.leadOwner || (activeAdmin ? activeAdmin.adminName : "Admin CS"),
        leadScore: analysis.leadScore,
        temperature: analysis.temperature,
        followUpDate: followUpDueDate,
      },
    });

    // 5. Catat Interaksi Lengkap ke Database Neon
    const interaction = await prisma.leadInteraction.create({
      data: {
        leadId: lead.id,
        direction: "INBOUND",
        messageText,
        intentCategory: analysis.intentCategory,
        sentiment: analysis.sentiment,
        urgencyScore: analysis.urgencyScore,
        leadScore: analysis.leadScore,
        temperature: analysis.temperature,
        ruleSignals: analysis.ruleSignals.length > 0 ? analysis.ruleSignals.join(", ") : null,
        summary: analysis.summary,
        recommendedReply: analysis.recommendedReply,
        suggestedAction: analysis.suggestedAction,
        priorityReason: analysis.priorityReason,
        followUpReason: analysis.followUpReason,
        followUpDueDate: followUpDueDate,
        aiConfidence: analysis.aiConfidence,
        needsFollowUp: analysis.needsFollowUp,
        isHighPriority: analysis.isHighPriority,
        usedStrongAi: analysis.usedStrongAi,
        handledByAdmin: activeAdmin ? activeAdmin.adminName : "Admin CS",
      },
    });

    // 6. Sinkronisasi Baris Baru ke Google Sheets
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
      recommendedReply: analysis.recommendedReply,
      suggestedAction: analysis.suggestedAction,
      messageText,
      needsFollowUp: analysis.needsFollowUp,
      isHighPriority: analysis.isHighPriority,
      handledByAdmin: activeAdmin?.adminName || "Admin CS",
      timestamp: new Date().toISOString(),
    });

    // 7. Jika Prioritas Tinggi -> Kirim Notifikasi WhatsApp Alert ke Admin Bertugas
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
