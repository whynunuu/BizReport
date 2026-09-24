import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { batchSyncToGoogleSheets, SyncLeadData } from "@/lib/services/sheets-sync";

export const dynamic = "force-dynamic";

/**
 * Helper untuk format waktu WIB (Asia/Jakarta)
 */
function formatJakartaTimestamp(d: Date | string): string {
  try {
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(dateObj);
  } catch {
    return "-";
  }
}

/**
 * Handler utama sinkronisasi seluruh data CRM ke Google Sheets
 */
async function handleSync(request: NextRequest) {
  try {
    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    const sheetId = process.env.GOOGLE_SHEET_ID;

    // Ambil seluruh leads beserta riwayat interaksi
    const leads = await prisma.lead.findMany({
      include: {
        interactions: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const syncPayload: SyncLeadData[] = leads.map((lead) => {
      const topInteraction = lead.interactions[0];
      const maxUrgency = Math.max(
        ...lead.interactions.map((i) => i.urgencyScore),
        1
      );
      const hasHighPriority =
        lead.interactions.some((i) => i.isHighPriority) ||
        lead.temperature === "HOT";
      const needsFollowUp = lead.interactions.some((i) => i.needsFollowUp);

      const latestTime = topInteraction?.createdAt || lead.updatedAt;

      return {
        phoneNumber: lead.phoneNumber,
        name: lead.name || "Tanpa Nama",
        status: lead.status,
        intentCategory: topInteraction?.intentCategory || "INFO_UMUM",
        sentiment: topInteraction?.sentiment || "NETRAL",
        urgencyScore: maxUrgency,
        leadScore: lead.leadScore || 50,
        temperature: lead.temperature || "COLD",
        ruleSignals: topInteraction?.ruleSignals || "",
        summary: topInteraction?.summary || lead.contextNotes || "-",
        recommendedReply: topInteraction?.recommendedReply || "-",
        suggestedAction: topInteraction?.suggestedAction || "-",
        messageText: topInteraction?.messageText || "-",
        needsFollowUp,
        isHighPriority: hasHighPriority,
        handledByAdmin:
          topInteraction?.handledByAdmin ||
          lead.closingAdmin ||
          lead.leadOwner ||
          "Admin CS",
        timestamp: formatJakartaTimestamp(latestTime),
      };
    });

    // Jalankan batch sync ke Google Sheets Webhook
    const syncResult = await batchSyncToGoogleSheets(syncPayload, "reset_and_sync");

    return NextResponse.json({
      status: syncResult.success ? "success" : "partial_error",
      totalLeads: leads.length,
      syncedCount: syncResult.count,
      webhookConfigured: Boolean(webhookUrl && webhookUrl.trim() !== ""),
      sheetId: sheetId || "11a5G5Dk18s_VgJ9pkFMhC6XJ6KwTq67CNcrDJlmqLwI",
      message: syncResult.success
        ? `✅ Berhasil menyinkronkan ${leads.length} leads ke Google Sheet!`
        : `Peringatan sync: ${syncResult.message}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errMsg =
      error instanceof Error ? error.message : "Terjadi kesalahan saat sync";
    console.error("[SyncGoogleSheetsRoute] Error:", error);
    return NextResponse.json(
      { status: "error", message: errMsg },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}
