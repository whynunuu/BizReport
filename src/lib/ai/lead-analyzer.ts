import { GoogleGenAI, Type } from "@google/genai";

// Mengatasi isu UNABLE_TO_VERIFY_LEAF_SIGNATURE pada Windows/Node.js lokal saat mengakses API eksternal
if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

export interface LeadAnalysisInput {

  messageText: string;
  senderNumber: string;
  senderName?: string | null;
  isExistingLead: boolean;
  leadContext?: string | null;
  hasBooking?: boolean;
  lastBookingDate?: Date | null;
  currentAdminShift?: {
    adminName: string;
    phoneNumber: string;
  } | null;
}

export interface LeadAnalysisResult {
  intentCategory: "TANYA_PRODUK" | "BOOKING" | "KOMPLAIN" | "PRICELIST" | "INFO_UMUM";
  sentiment: "POSITIF" | "NETRAL" | "NEGATIF";
  urgencyScore: number; // 1 (santai) s.d 5 (urgent)
  summary: string;
  recommendedReply: string;
  needsFollowUp: boolean;
  isHighPriority: boolean;
  usedStrongAi: boolean;
  extractedName?: string;
  updatedContextNotes?: string;
}

const analysisResponseSchema = {
  type: Type.OBJECT,
  properties: {
    intentCategory: {
      type: Type.STRING,
      enum: ["TANYA_PRODUK", "BOOKING", "KOMPLAIN", "PRICELIST", "INFO_UMUM"],
      description: "Kategori niat utama pengirim",
    },
    sentiment: {
      type: Type.STRING,
      enum: ["POSITIF", "NETRAL", "NEGATIF"],
      description: "Sentimen pesan pelanggan",
    },
    urgencyScore: {
      type: Type.INTEGER,
      description: "Tingkat urgensi 1 (santai/info umum) sampai 5 (urgent/komplain/mau booking hari ini)",
    },
    summary: {
      type: Type.STRING,
      description: "Ringkasan 1-2 kalimat mengenai inti pesan dan kebutuhan pelanggan",
    },
    recommendedReply: {
      type: Type.STRING,
      description: "Draf balasan WhatsApp yang ramah, profesional, dan siap dikirimkan admin CS",
    },
    needsFollowUp: {
      type: Type.BOOLEAN,
      description: "Apakah pelanggan ini perlu di-follow up secara aktif oleh admin?",
    },
    isHighPriority: {
      type: Type.BOOLEAN,
      description: "True jika ada potensi deal besar, komplain keras, atau butuh respon segera",
    },
    needsDeepAnalysis: {
      type: Type.BOOLEAN,
      description: "True jika pesan ini sangat rumit, ambigu, bermasalah berat, atau butuh analisis tingkat lanjut (Tier 2)",
    },
    extractedName: {
      type: Type.STRING,
      description: "Nama panggilan atau nama lengkap pelanggan jika mereka menyebutkannya di pesan",
      nullable: true,
    },
    updatedContextNotes: {
      type: Type.STRING,
      description: "Catatan profil singkat yang perlu disimpan di database mengenai preferensi/status pelanggan ini",
    },
  },
  required: [
    "intentCategory",
    "sentiment",
    "urgencyScore",
    "summary",
    "recommendedReply",
    "needsFollowUp",
    "isHighPriority",
    "needsDeepAnalysis",
    "updatedContextNotes",
  ],
};

/**
 * 2-Tier AI Engine Analyzer:
 * Tier 1: Gemini 3.8 Flash (Cepat & hemat)
 * Tier 2: Gemini 3.1 Pro (Mendalam jika perlu eskalasi)
 */
export async function analyzeLeadMessage(input: LeadAnalysisInput): Promise<LeadAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  // Fallback jika API key belum diisi pengguna
  if (!apiKey || apiKey.trim() === "") {
    console.warn("[LeadAnalyzer] GEMINI_API_KEY belum diatur. Menggunakan parser cerdas lokal (fallback).");
    return fallbackLocalAnalysis(input);
  }

  const ai = new GoogleGenAI({ apiKey });

  const promptKonteks = `
Kamu adalah Analis CRM & Customer Service AI cerdas untuk bisnis.
Tugasmu adalah menganalisis pesan masuk WhatsApp dari pelanggan, mengklasifikasi intent, sentimen, dan tingkat urgensi untuk admin CS.

Informasi Konteks:
- Pengirim: ${input.senderName || "Belum dikenal"} (${input.senderNumber})
- Status Kontak: ${input.isExistingLead ? "Pelanggan Lama" : "Lead Baru"}
- Riwayat/Konteks Lama: ${input.leadContext || "Belum ada catatan"}
- Status Booking Sebelumnya: ${input.hasBooking ? "Pernah booking" : "Belum pernah"}
- Admin Bertugas Saat Ini: ${input.currentAdminShift?.adminName || "Admin CS"}

Pesan Pelanggan:
"""
${input.messageText}
"""

Instruksi Analisis:
1. Pahami inti kebutuhan pelanggan (apakah tanya harga/pricelist, tanya ketersediaan/booking, komplain, atau pertanyaan umum).
2. Tentukan sentimen (POSITIF, NETRAL, atau NEGATIF).
3. Berikan nilai urgensi 1-5.
4. Buatkan rekomendasi draf balasan yang sopan, ramah, dan solutif berbahasa Indonesia.
5. Set needsDeepAnalysis = true HANYA jika pesan berisi komplain serius, permintaan paket bernilai tinggi yang butuh negosiasi khusus, atau sangat membingungkan.
`;

  try {
    // TIER 1: Analisis Rutin (gemini-3.5-flash-lite - super stabil & respon kilat)
    const tier1Response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: promptKonteks,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisResponseSchema,
      },
    });

    const parsedData = JSON.parse(tier1Response.text || "{}");

    // Evaluasi apakah perlu Tier 2 (Deep Reasoning jika komplain / urgent)
    let usedStrongAi = false;
    let finalReply = parsedData.recommendedReply;
    const finalSummary = parsedData.summary;

    if (parsedData.needsDeepAnalysis || parsedData.urgencyScore >= 5 || parsedData.intentCategory === "KOMPLAIN") {
      try {
        console.log("[LeadAnalyzer] Mengekskalasi pesan ke Tier 2 (Deep Reasoning)...");
        const tier2Prompt = `
Konteks Analisis Sebelumnya:
- Kategori: ${parsedData.intentCategory}
- Masalah: ${parsedData.summary}
- Pesan Asli Pelanggan: "${input.messageText}"

Tugas Senior CS Strategist:
Berikan rekomendasi draf balasan terbaik yang sangat empati, diplomatis, sopan, dan solutif berbahasa Indonesia agar masalah cepat selesai. Tulis teks balasannya langsung tanpa embel-embel.
`;
        const tier2Response = await ai.models.generateContent({
          model: "gemini-3.5-flash-lite",
          contents: tier2Prompt,
        });

        if (tier2Response.text) {
          finalReply = tier2Response.text.trim();
          usedStrongAi = true;
        }
      } catch (err) {
        console.warn("[LeadAnalyzer] Tier 2 escalation fallback, tetap menggunakan Tier 1.", err);
      }
    }



    return {
      intentCategory: parsedData.intentCategory || "INFO_UMUM",
      sentiment: parsedData.sentiment || "NETRAL",
      urgencyScore: parsedData.urgencyScore ?? 2,
      summary: finalSummary || "Pesan dari pelanggan",
      recommendedReply: finalReply || "Halo kak, terima kasih sudah menghubungi kami. Ada yang bisa kami bantu?",
      needsFollowUp: Boolean(parsedData.needsFollowUp),
      isHighPriority: Boolean(parsedData.isHighPriority),
      usedStrongAi,
      extractedName: parsedData.extractedName,
      updatedContextNotes: parsedData.updatedContextNotes,
    };
  } catch (error) {
    console.error("[LeadAnalyzer] Error saat memanggil Gemini API:", error);
    return fallbackLocalAnalysis(input);
  }
}

/**
 * Fallback jika API key belum aktif atau koneksi internet terputus
 */
function fallbackLocalAnalysis(input: LeadAnalysisInput): LeadAnalysisResult {
  const text = input.messageText.toLowerCase();

  let intentCategory: LeadAnalysisResult["intentCategory"] = "INFO_UMUM";
  let urgencyScore = 2;
  let needsFollowUp = false;
  let isHighPriority = false;

  if (text.includes("harga") || text.includes("pricelist") || text.includes("paket") || text.includes("biaya")) {
    intentCategory = "PRICELIST";
    needsFollowUp = true;
  } else if (text.includes("booking") || text.includes("jadwal") || text.includes("slot") || text.includes("pesan")) {
    intentCategory = "BOOKING";
    urgencyScore = 4;
    needsFollowUp = true;
    isHighPriority = true;
  } else if (
    text.includes("kecewa") ||
    text.includes("rusak") ||
    text.includes("salah") ||
    text.includes("komplain") ||
    text.includes("belum dikirim") ||
    text.includes("segera") ||
    text.includes("mendesak") ||
    text.includes("urgent")
  ) {
    intentCategory = "KOMPLAIN";
    urgencyScore = 5;
    needsFollowUp = true;
    isHighPriority = true;
  }


  return {
    intentCategory,
    sentiment: intentCategory === "KOMPLAIN" ? "NEGATIF" : "NETRAL",
    urgencyScore,
    summary: `Pesan seputar ${intentCategory.toLowerCase()}: "${input.messageText.slice(0, 80)}..."`,
    recommendedReply: "Halo kak, terima kasih sudah menghubungi kami! Pesan kakak sudah kami terima dan admin akan segera membalas ya kak 🙏",
    needsFollowUp,
    isHighPriority,
    usedStrongAi: false,
    updatedContextNotes: `Minat pada ${intentCategory.toLowerCase()}`,
  };
}
