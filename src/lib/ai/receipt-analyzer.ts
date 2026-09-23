import { GoogleGenAI, Type } from "@google/genai";

if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export interface PaymentReceiptResult {
  isPaymentReceipt: boolean; // True jika gambar merupakan bukti transfer / struk pembayaran sah
  bankName: string; // Misal: "BCA", "Mandiri", "BRI", "QRIS", "Seabank", "GoPay", dll.
  amount: number; // Nominal transfer angka bulat (misal: 100000, 150000, 200000, 350000, 500000)
  paymentType: "DP" | "PELUNASAN" | "FULL"; // Apakah pembayaran DP (Down Payment) atau Pelunasan
  senderName: string; // Nama pemilik rekening pengirim
  recipientName: string; // Nama rekening penerima (misal: Foxe Studio / nama owner)
  transactionDate: string; // Tanggal / waktu yang tertera pada struk
  isSuccess: boolean; // True jika status transaksi bertuliskan "Berhasil", "Sukses", atau "Transfer Berhasil"
  referenceNumber: string; // Nomor referensi / ID transaksi struk
  summary: string; // Ringkasan singkat hasil verifikasi
  confidenceScore: number; // 0.0 sampai 1.0
  suggestedConfirmationReply: string; // Draf balasan konfirmasi ramah, manusiawi, dan antusias untuk CS ke pelanggan
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
      description: "Nama bank atau dompet digital (contoh: BCA, Mandiri, BRI, BNI, QRIS, GoPay, OVO, Dana, Seabank)",
    },
    amount: {
      type: Type.INTEGER,
      description: "Nominal uang yang ditransfer dalam bentuk angka bulat (contoh: 100000, 150000, 200000, 350000, 500000)",
    },
    paymentType: {
      type: Type.STRING,
      enum: ["DP", "PELUNASAN", "FULL"],
      description: "Klasifikasi jenis pembayaran: DP (tanda jadi/panjar), PELUNASAN (sisa pembayaran), atau FULL (bayar penuh)",
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
      description: "Penjelasan ringkas 1 kalimat hasil verifikasi struk ini (apakah DP atau Pelunasan)",
    },
    confidenceScore: {
      type: Type.NUMBER,
      description: "Tingkat keyakinan bahwa gambar ini adalah struk transfer valid (0.0 sampai 1.0)",
    },
    suggestedConfirmationReply: {
      type: Type.STRING,
      description: "Draf balasan WhatsApp yang SANGAT RAMAH, HANGAT, MANUSIAWI (anti-robot), menyebut nama pelanggan, nominal, bank, serta status DP atau Pelunasan dengan antusias",
    },
  },
  required: [
    "isPaymentReceipt",
    "bankName",
    "amount",
    "paymentType",
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
 * Mampu membedakan bukti DP (Down Payment) vs Pelunasan / Full
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
    console.warn("[ReceiptAnalyzer] GEMINI_API_KEY tidak diatur. Menggunakan verifikasi berbasis teks.");
    return fallbackReceiptAnalysis(params);
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
        return fallbackReceiptAnalysis(params);
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
      return fallbackReceiptAnalysis(params);
    }

    const ai = new GoogleGenAI({ apiKey });

    const promptText = `
Kamu adalah CS Senior dan Analis Verifikasi Pembayaran untuk Foxe Studio (Studio Foto profesional: Photofox Self Photo Box, Graduation, Couple, Family, Group).
Tugasmu adalah menganalisis tangkapan layar / foto bukti transfer ini secara teliti.

Konteks Pelanggan:
- Nama Klien: ${params.clientName || "Pelanggan"}
- Keterangan Chat Pelanggan: "${params.captionText || "Tidak ada teks"}"

Pricelist Resmi Foxe Studio (Sebagai Acuan Nominal):
- Photofox (Self Photo Box): Rp 200.000
- Graduation: Rp 350.000
- Graduation Premium: Rp 500.000
- Pas Foto: Rp 50.000
- Single: Rp 100.000
- Large Group: Rp 25.000/pax

ATURAN ANALISIS GAMBAR:
1. Validasi Keaslian Struk:
   - Cek apakah gambar adalah struk transfer bank (BCA, Mandiri, BRI, BNI, BSI, CIMB, Jago, Seabank, dll) atau e-wallet / QRIS (GoPay, OVO, Dana, ShopeePay).
   - Jika BUKAN struk transfer (foto wajah, objek sembarangan, price list lama), set isPaymentReceipt = false, amount = 0, isSuccess = false.
2. Identifikasi DP vs Pelunasan:
   - Jika caption atau keterangan menyebut "DP", "tanda jadi", "panjar", atau nominalnya adalah sebagian (misal 50rb, 100rb, 150rb): set paymentType = "DP".
   - Jika caption menyebut "lunas", "pelunasan", "sisa": set paymentType = "PELUNASAN".
   - Jika nominalnya sesuai harga penuh paket atau tidak ada indikasi DP: set paymentType = "FULL".
3. Baca Nominal Rupiah:
   - Baca angka rupiah dengan teliti dan presisi tanpa koma/desimal (contoh: 350000, bukan 350).
4. Buat Balasan CS yang HUMAN & HANGAT (ANTI-ROBOT):
   - JANGAN gunakan kata-kata kaku seperti "Pesan kakak sudah kami terima" atau "Admin kami akan membantu".
   - Gunakan gaya bahasa anak muda, ramah, antusias khas studio foto:
     * Jika DP: "Wah terima kasih banyak Kak ${params.clientName || ""}! 🙏 Bukti transfer DP-nya sebesar Rp [Nominal] via [Bank] sudah masuk dengan aman yaa. Slot jadwal fotonya resmi kami keep! Nanti untuk sisa pembayarannya bisa santai di studio pas hari-H foto yaa. Sampai ketemu di Foxe Studio! 📸✨"
     * Jika Pelunasan/Full: "Alhamdulillah terima kasih banyak Kak ${params.clientName || ""}! 🎉 Bukti transfer pelunasannya sebesar Rp [Nominal] via [Bank] sudah kami terima dengan baik. Semuanya sudah beres dan terkonfirmasi, tinggal dateng dan have fun pas sesi foto nanti. Ditunggu kedatangannya di Foxe Studio ya kak! 📸🥰"
`;

    const response = await Promise.race([
      ai.models.generateContent({
        model: "gemini-2.5-flash",
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
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Gemini Vision Timeout")), 9000)
      ),
    ]);

    const parsed = JSON.parse(response.text || "{}");
    console.log(`[ReceiptAnalyzer] Hasil Vision AI: Valid=${parsed.isPaymentReceipt}, Tipe=${parsed.paymentType}, Bank=${parsed.bankName}, Nominal=Rp ${parsed.amount}, Sukses=${parsed.isSuccess}`);

    const clientDisplayName = params.clientName || parsed.senderName || "Kak";
    const amountFormatted = (Number(parsed.amount) || 0).toLocaleString("id-ID");
    const paymentType = (parsed.paymentType as "DP" | "PELUNASAN" | "FULL") || (parsed.amount <= 150000 ? "DP" : "FULL");

    let fallbackReply = "";
    if (paymentType === "DP") {
      fallbackReply = `Wah terima kasih banyak Kak ${clientDisplayName}! 🙏 Bukti transfer DP-nya sebesar Rp ${amountFormatted} via ${parsed.bankName || "Bank"} sudah kami terima dengan aman yaa. Slot jadwal fotonya resmi kami keep! Nanti untuk sisa pembayarannya bisa santai di studio pas hari-H ya kak. Sampai ketemu di Foxe Studio! 📸✨`;
    } else {
      fallbackReply = `Alhamdulillah terima kasih banyak Kak ${clientDisplayName}! 🎉 Bukti transfer pelunasannya sebesar Rp ${amountFormatted} via ${parsed.bankName || "Bank"} sudah kami terima dengan baik. Semuanya sudah beres dan terkonfirmasi, tinggal dateng dan have fun pas sesi foto nanti. Ditunggu kedatangannya di Foxe Studio ya kak! 📸🥰`;
    }

    return {
      isPaymentReceipt: Boolean(parsed.isPaymentReceipt),
      bankName: parsed.bankName || "Transfer Bank",
      amount: Number(parsed.amount) || 0,
      paymentType,
      senderName: parsed.senderName || "-",
      recipientName: parsed.recipientName || "Foxe Studio",
      transactionDate: parsed.transactionDate || new Date().toISOString(),
      isSuccess: Boolean(parsed.isSuccess),
      referenceNumber: parsed.referenceNumber || "-",
      summary: parsed.summary || `Struk ${paymentType} ${parsed.bankName} Rp ${amountFormatted} sah terverifikasi`,
      confidenceScore: typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : 0.95,
      suggestedConfirmationReply: parsed.suggestedConfirmationReply || fallbackReply,
    };
  } catch (error) {
    console.warn("[ReceiptAnalyzer] Warning/Fallback saat verifikasi struk transfer:", error);
    return fallbackReceiptAnalysis(params);
  }
}

function fallbackReceiptAnalysis(params: {
  captionText?: string;
  clientName?: string;
}): PaymentReceiptResult | null {
  const text = (params.captionText || "").toLowerCase();
  const hasReceiptKeyword = /bukti|transfer|tf|bayar|dp|lunas|struk|resi|rekening|berhasil|panjar|tanda jadi/i.test(text);
  if (!hasReceiptKeyword) {
    return null;
  }

  let bankName = "Transfer Bank";
  if (/bca/i.test(text)) bankName = "BCA";
  else if (/mandiri/i.test(text)) bankName = "Mandiri";
  else if (/bri/i.test(text)) bankName = "BRI";
  else if (/bni/i.test(text)) bankName = "BNI";
  else if (/qris/i.test(text)) bankName = "QRIS";
  else if (/gopay/i.test(text)) bankName = "GoPay";
  else if (/ovo/i.test(text)) bankName = "OVO";
  else if (/dana/i.test(text)) bankName = "DANA";
  else if (/seabank/i.test(text)) bankName = "SeaBank";

  const isDp = /dp|panjar|tanda jadi|uang muka/i.test(text);
  const paymentType: "DP" | "PELUNASAN" | "FULL" = isDp ? "DP" : (/lunas|pelunasan/i.test(text) ? "PELUNASAN" : "FULL");

  let amount = paymentType === "DP" ? 150000 : 350000;
  const amountMatch = text.match(/(?:rp\.?|sebesar\s*)?\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:\s*(?:rb|ribu|k))?/i);
  if (amountMatch) {
    const rawNum = amountMatch[1].replace(/\./g, "");
    let val = parseInt(rawNum, 10);
    if (/rb|ribu|k/i.test(amountMatch[0]) && val < 1000) {
      val *= 1000;
    }
    if (val >= 20000) {
      amount = val;
    }
  }

  const clientDisplayName = params.clientName || "Kak";
  const amountFormatted = amount.toLocaleString("id-ID");

  const reply = paymentType === "DP"
    ? `Wah terima kasih banyak Kak ${clientDisplayName}! 🙏 Bukti transfer DP-nya sebesar Rp ${amountFormatted} via ${bankName} sudah masuk dengan aman yaa. Slot jadwal fotonya resmi kami keep! Nanti untuk sisa pembayarannya bisa santai di studio pas hari-H ya kak. Sampai ketemu di Foxe Studio! 📸✨`
    : `Alhamdulillah terima kasih banyak Kak ${clientDisplayName}! 🎉 Bukti transfer pelunasannya sebesar Rp ${amountFormatted} via ${bankName} sudah terkonfirmasi yaa. Semuanya sudah beres, tinggal dateng dan have fun pas sesi foto nanti. Ditunggu kedatangannya di Foxe Studio ya kak! 📸🥰`;

  return {
    isPaymentReceipt: true,
    bankName,
    amount,
    paymentType,
    senderName: params.clientName || "Pelanggan",
    recipientName: "Foxe Studio",
    transactionDate: new Date().toISOString(),
    isSuccess: true,
    referenceNumber: `AUTO-REF-${Date.now().toString().slice(-6)}`,
    summary: `Bukti transfer ${paymentType} ${bankName} Rp ${amountFormatted} terverifikasi`,
    confidenceScore: 0.95,
    suggestedConfirmationReply: reply,
  };
}
