/**
 * Google Sheets Synchronization Service
 * Menyinkronkan data Lead, Interaksi, dan Antrian Follow-Up ke Google Sheets.
 * Mendukung Google Apps Script Webhook (Metode paling mudah tanpa ribet Google Cloud Console)
 * ataupun Service Account.
 */

export interface SyncLeadData {
  phoneNumber: string;
  name?: string | null;
  status: string;
  intentCategory?: string | null;
  sentiment?: string | null;
  urgencyScore?: number;
  leadScore?: number;
  temperature?: string;
  ruleSignals?: string;
  summary?: string | null;
  recommendedReply?: string | null;
  suggestedAction?: string | null;
  messageText: string;
  needsFollowUp: boolean;
  isHighPriority: boolean;
  handledByAdmin?: string | null;
  timestamp: string;
}

export async function syncToGoogleSheets(data: SyncLeadData): Promise<{ success: boolean; message?: string }> {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  // Jika URL webhook Google Sheets belum diatur di .env
  if (!webhookUrl || webhookUrl.trim() === "") {
    console.log(`[GoogleSheetsSync - SIMULASI]
📊 Baris baru siap disinkronkan ke Google Sheets:
- Nomor: ${data.phoneNumber}
- Nama: ${data.name || "-"}
- Kategori: ${data.intentCategory || "INFO_UMUM"}
- Sentimen: ${data.sentiment} (Urgensi: ${data.urgencyScore}/5)
- Follow Up: ${data.needsFollowUp ? "YA" : "TIDAK"}
- Prioritas: ${data.isHighPriority ? "TINGGI 🔥" : "NORMAL"}
- Ringkasan: ${data.summary}
(Untuk sync otomatis ke spreadsheet, masukkan GOOGLE_SHEETS_WEBHOOK_URL di file .env)`);
    return { success: true, message: "Simulasi sync berhasil dicatat" };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      redirect: "follow",
    });

    if (response.ok) {
      console.log("[GoogleSheetsSync] Data berhasil terkirim ke Google Sheets");
      return { success: true };
    } else {
      console.warn("[GoogleSheetsSync] Respon Google Sheets non-200:", response.status);
      return { success: false, message: `Status: ${response.status}` };
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Terjadi kesalahan saat sync Google Sheets";
    console.error("[GoogleSheetsSync] Gagal menyinkronkan ke Google Sheets:", error);
    // Non-blocking error agar tidak mengganggu alur utama
    return { success: false, message: errMsg };
  }
}

/**
 * Menyinkronkan seluruh daftar leads sekaligus (Batch / Bulk Sync) ke Google Sheets.
 * Digunakan untuk backfill data awal atau sinkronisasi terjadwal harian.
 */
export async function batchSyncToGoogleSheets(
  leads: SyncLeadData[],
  action: "append" | "reset_and_sync" = "reset_and_sync"
): Promise<{ success: boolean; count: number; message?: string }> {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  if (!webhookUrl || webhookUrl.trim() === "") {
    return {
      success: false,
      count: 0,
      message: "GOOGLE_SHEETS_WEBHOOK_URL belum dikonfigurasi di environment.",
    };
  }

  try {
    const payload =
      action === "reset_and_sync"
        ? { action: "reset_and_sync", leads }
        : leads;

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    if (response.ok) {
      return { success: true, count: leads.length };
    } else {
      return {
        success: false,
        count: 0,
        message: `Google Sheets webhook merespon status ${response.status}`,
      };
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Gagal batch sync Google Sheets";
    return { success: false, count: 0, message: errMsg };
  }
}

