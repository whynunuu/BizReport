/**
 * WhatsApp Gateway Service (Fonnte / Generic Gateway)
 * Digunakan untuk mengirim pesan balasan atau alert ke nomor WhatsApp Admin
 */

export interface SendWhatsAppParams {
  target: string; // Nomor HP tujuan (format: 0812... atau 62812...)
  message: string;
}

export async function sendWhatsAppMessage(params: SendWhatsAppParams): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const token = process.env.FONNTE_TOKEN;

  // Format nomor telepon agar standar (hilangkan tanda +, spasi, dash)
  let cleanNumber = params.target.replace(/[^0-9]/g, "");
  if (cleanNumber.startsWith("08")) {
    cleanNumber = "628" + cleanNumber.slice(2);
  }

  // Jika token belum diatur, lakukan simulasi log di konsol agar aman saat testing
  if (!token || token.trim() === "") {
    console.log(`[WhatsAppService - SIMULASI]
📱 Tujuan: ${cleanNumber}
💬 Pesan:
------------------------------------------
${params.message}
------------------------------------------
(Untuk mengirim sungguhan, isi FONNTE_TOKEN di file .env)`);
    return { success: true, data: { simulated: true, target: cleanNumber } };
  }

  try {
    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: cleanNumber,
        message: params.message,
      }),
    });

    const result = await response.json();
    console.log("[WhatsAppService] Pesan terkirim:", result);
    return { success: true, data: result };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Gagal menghubungi gateway WhatsApp";
    console.error("[WhatsAppService] Gagal mengirim pesan WA:", error);
    return { success: false, error: errMsg };
  }
}

