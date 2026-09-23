import { GoogleGenAI, Type } from "@google/genai";

if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export interface PaymentReceiptResult {
  isPaymentReceipt: boolean; // True jika gambar merupakan bukti transfer / struk pembayaran sah
  bankName: string; // Misal: "BCA", "Mandiri", "BRI", "QRIS", "Seabank", "GoPay", dll.
  amount: number; // Nominal transfer angka bulat (misal: 150000, 200000, 350000)
  senderName: string; // Nama pemilik rekening pengirim
  recipientName: string; // Nama rekening penerima (misal: Foxe Studio / nama owner)
  transactionDate: string; // Tanggal / waktu yang tertera pada struk
  isSuccess: boolean; // True jika status transaksi bertuliskan "Berhasil", "Sukses", atau "Transfer Berhasil"
  referenceNumber: string; // Nomor referensi / ID transaksi struk
  summary: string; // Ringkasan singkat hasil verifikasi
  confidenceScore: number; // 0.0 sampai 1.0
  suggestedConfirmationReply: string; // Draf balasan konfirmasi resmi untuk CS ke pelanggan
}

const receiptResponseSchema = {
  type: Type.OBJECT,
  properties: {
    isPaymentReceipt: {
      type: Type.BOOLEAN,
      description: "True jika gambar adalah bukti transfer bank, mobile banking, ATM, atau QRIS sah",
    },
    bankName: {
      type: Type.STRING,
      description: "Nama bank atau dompet digital (contoh: BCA, Mandiri, BRI, BNI, QRIS, GoPay, OVO, Dana)",
    },
    amount: {
      type: Type.INTEGER,
      description: "Nominal uang yang ditransfer dalam bentuk angka bulat (contoh: 150000, 350000, 500000)",
    },
    senderName: {
      type: Type.STRING,
      description: "Nama pengirim rekening yang tertera di struk",
    },
    recipientName: {
      type: Type.STRING,
      description: "Nama penerima rekening yang tertera di struk",
    },
    transactionDate: {
      type: Type.STRING,
      description: "Waktu atau tanggal transaksi yang tertera di struk",
    },
    isSuccess: {
      type: Type.BOOLEAN,
      description: "True jika transaksi bertuliskan Berhasil, Sukses, atau Success (bukan pending/gagal)",
    },
    referenceNumber: {
      type: Type.STRING,
      description: "Nomor referensi atau nomor transaksi pada struk",
    },
    summary: {
      type: Type.STRING,
      description: "Penjelasan ringkas 1 kalimat hasil verifikasi struk ini",
    },
    confidenceScore: {
      type: Type.NUMBER,
      description: "Tingkat keyakinan bahwa gambar ini adalah struk transfer valid (0.0 sampai 1.0)",
    },
    suggestedConfirmationReply: {
      type: Type.STRING,
      description: "Draf balasan ramah dan resmi mengonfirmasi penerimaan pembayaran DP/lunas untuk klien Foxe Studio",
    },
  },
  required: [
    "isPaymentReceipt",
    "bankName",
    "amount",
    "senderName",
    "isSuccess",
    "referenceNumber",
    "summary",
    "confidenceScore",
    "suggestedConfirmationReply",
  ],
};

/**
 * Menganalisis gambar bukti transfer menggunakan Gemini Multimodal Vision AI
 */
export async function analyzePaymentReceipt(params: {
  imageUrl?: string;
  imageBase64?: string;
  mimeType?: string;
  captionText?: string;
  clientName?: string;
}): Promise<PaymentReceiptResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[ReceiptAnalyzer] GEMINI_API_KEY tidak diatur. Melewati verifikasi visual.");
    return null;
  }

  try {
    let base64Data = params.imageBase64;
    let mimeType = params.mimeType || "image/jpeg";

    // Jika diberikan URL gambar, download terlebih dahulu
    if (!base64Data && params.imageUrl) {
      console.log(`[ReceiptAnalyzer] Mengunduh gambar bukti transfer dari: ${params.imageUrl}`);
      const imgRes = await fetch(params.imageUrl, {
        headers: { "User-Agent": "Foxe-Studio-Bot/1.0" },
      });

      if (!imgRes.ok) {
        console.warn(`[ReceiptAnalyzer] Gagal mengunduh gambar (Status: ${imgRes.status})`);
        return null;
      }

      const buffer = await imgRes.arrayBuffer();
      base64Data = Buffer.from(buffer).toString("base64");
      const detectedMime = imgRes.headers.get("content-type");
      if (detectedMime && detectedMime.startsWith("image/")) {
        mimeType = detectedMime;
      }
    }

    if (!base64Data) {
      console.warn("[ReceiptAnalyzer] Tidak ada data gambar yang valid untuk dianalisis.");
      return null;
    }

    const ai = new GoogleGenAI({ apiKey });

    const promptText = `
Kamu adalah Sistem Audit Verifikasi Pembayaran & Struk Transfer AI untuk Foxe Studio.
Tugasmu adalah menganalisis foto / tangkapan layar yang dikirimkan oleh customer di WhatsApp untuk memverifikasi apakah ini adalah BUKTI TRANSFER PEMBAYARAN SAH.

Konteks Tambahan:
- Nama Klien di Kontak: ${params.clientName || "Pelanggan"}
- Keterangan Chat Tambahan: "${params.captionText || "Tidak ada keterangan tambahan"}"

Instruksi Analisis:
1. Periksa apakah gambar ini adalah struk transfer bank (BCA, Mandiri, BNI, BRI, BSI, CIMB, Jago, Seabank), dompet digital (GoPay, OVO, Dana, ShopeePay), atau QRIS.
2. Jika BUKAN struk transfer (misalnya hanya foto selfie, katalog produk, atau gambar sembarangan), set isPaymentReceipt = false, amount = 0, isSuccess = false.
3. Jika YA struk transfer:
   - Baca nominal angka rupiah secara akurat tanpa salah angka (contoh: Rp 150.000 -> 150000, Rp 200.000 -> 200000, Rp 350.000 -> 350000).
   - Pastikan status transaksi menunjukkan "Berhasil" / "Sukses" / "Transfer Berhasil".
   - Buatkan draf suggestedConfirmationReply yang sangat ramah, profesional, dan menegaskan bahwa jadwal sesi fotonya sudah TERKONFIRMASI.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: promptText,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: receiptResponseSchema,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    console.log(`[ReceiptAnalyzer] Hasil Analisis Struk: Valid=${parsed.isPaymentReceipt}, Bank=${parsed.bankName}, Nominal=Rp ${parsed.amount}, Sukses=${parsed.isSuccess}`);

    return {
      isPaymentReceipt: Boolean(parsed.isPaymentReceipt),
      bankName: parsed.bankName || "Transfer Bank",
      amount: Number(parsed.amount) || 0,
      senderName: parsed.senderName || "-",
      recipientName: parsed.recipientName || "Foxe Studio",
      transactionDate: parsed.transactionDate || new Date().toISOString(),
      isSuccess: Boolean(parsed.isSuccess),
      referenceNumber: parsed.referenceNumber || "-",
      summary: parsed.summary || "Bukti transfer telah diverifikasi AI",
      confidenceScore: typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : 0.95,
      suggestedConfirmationReply:
        parsed.suggestedConfirmationReply ||
        `Halo Kak! Pembayaran transfer sebesar Rp ${(Number(parsed.amount) || 0).toLocaleString(
          "id-ID"
        )} via ${parsed.bankName || "Bank"} sudah kami terima dengan baik. Jadwal sesi foto kakak resmi TERKONFIRMASI! Sampai jumpa di Foxe Studio ya kak 📸✨`,
    };
  } catch (error) {
    console.error("[ReceiptAnalyzer] Error menganalisis gambar struk transfer:", error);
    return null;
  }
}
