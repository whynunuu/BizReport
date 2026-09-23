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
  leadScore: number; // 0 - 100 (0-30 Cold, 31-65 Warm, 66-100 Hot)
  temperature: "COLD" | "WARM" | "HOT";
  ruleSignals: string[]; // ["ASK_PRICE", "ASK_PACKAGE", "ASK_DATE", "ASK_AVAILABILITY", "MENTION_GROUP_SIZE", "ASK_DP", "ASK_BANK_ACCOUNT"]
  summary: string;
  recommendedReply: string; // Draf balasan untuk CS (Human-In-The-Loop)
  suggestedAction: string; // Tindakan operasional untuk admin
  priorityReason: string; // Alasan prioritas
  followUpDays: number; // 1 (H+1), 3 (H+3), atau 7 (H+7)
  followUpReason: string; // Alasan follow up
  aiConfidence: number; // 0.0 - 1.0
  needsFollowUp: boolean;
  isHighPriority: boolean;
  usedStrongAi: boolean;
  extractedName?: string;
  updatedContextNotes?: string;
}

/**
 * Deteksi sinyal Rule-Based sesuai modul 06_LEAD_SCORING
 */
export function extractRuleSignals(text: string): {
  signals: string[];
  ruleScore: number;
  isNearBooking: boolean;
} {
  const lower = text.toLowerCase();
  const signals: string[] = [];
  let ruleScore = 10; // Baseline
  let isNearBooking = false;

  if (/harga|biaya|tarif|pricelist|berapa/.test(lower)) {
    signals.push("ASK_PRICE");
    ruleScore += 15;
  }
  if (/paket|photofox|wisuda|graduation|couple|family|group|pas foto|self photo/.test(lower)) {
    signals.push("ASK_PACKAGE");
    ruleScore += 15;
  }
  if (/tanggal|hari|sabtu|minggu|besok|lusa|jadwal|slot|jam|tgl/.test(lower)) {
    signals.push("ASK_DATE");
    ruleScore += 20;
  }
  if (/bisa|ready|kosong|tersedia|ada slot|bisa booking|masih ada/.test(lower)) {
    signals.push("ASK_AVAILABILITY");
    ruleScore += 20;
  }
  if (/orang|pax|rombongan|keluarga|teman|berdua|grup/.test(lower)) {
    signals.push("MENTION_GROUP_SIZE");
    ruleScore += 15;
  }
  if (/dp|down payment|tanda jadi|panjar/.test(lower)) {
    signals.push("ASK_DP");
    ruleScore += 30;
    isNearBooking = true;
  }
  if (/rekening|transfer|bca|mandiri|qris|bayar|tf/.test(lower)) {
    signals.push("ASK_BANK_ACCOUNT");
    ruleScore += 30;
    isNearBooking = true;
  }

  return {
    signals,
    ruleScore: Math.min(ruleScore, 100),
    isNearBooking,
  };
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
      description: "Tingkat urgensi 1 (santai) sampai 5 (urgent/komplain/mau booking hari ini)",
    },
    leadScore: {
      type: Type.INTEGER,
      description: "Skor niat beli pelanggan 0-100 (0-30 Cold, 31-65 Warm, 66-100 Hot)",
    },
    temperature: {
      type: Type.STRING,
      enum: ["COLD", "WARM", "HOT"],
      description: "Klasifikasi suhu prospek leads",
    },
    summary: {
      type: Type.STRING,
      description: "Ringkasan 1-2 kalimat mengenai inti pesan dan kebutuhan pelanggan",
    },
    recommendedReply: {
      type: Type.STRING,
      description: "Draf balasan WhatsApp yang ramah, profesional, dan siap dikirimkan admin CS (Human in the loop)",
    },
    suggestedAction: {
      type: Type.STRING,
      description: "Rekomendasi aksi tindak lanjut untuk admin CS",
    },
    priorityReason: {
      type: Type.STRING,
      description: "Alasan penetapan prioritas",
    },
    followUpDays: {
      type: Type.INTEGER,
      description: "Jadwal follow up berikutnya dalam hari: 1 (H+1), 3 (H+3), atau 7 (H+7)",
    },
    followUpReason: {
      type: Type.STRING,
      description: "Alasan kontekstual untuk pesan follow up berikutnya",
    },
    aiConfidence: {
      type: Type.NUMBER,
      description: "Tingkat keyakinan analisis AI (0.0 sampai 1.0)",
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
    "leadScore",
    "temperature",
    "summary",
    "recommendedReply",
    "suggestedAction",
    "priorityReason",
    "followUpDays",
    "followUpReason",
    "aiConfidence",
    "needsFollowUp",
    "isHighPriority",
    "needsDeepAnalysis",
    "updatedContextNotes",
  ],
};

/**
 * 2-Tier AI Engine Analyzer:
 * Tier 1: Routine LLM (gemini-3.5-flash-lite)
 * Tier 2: Strong LLM (Deep reasoning escalation untuk komplain / low confidence / closing)
 * Human-In-The-Loop: AI can analyze, draft, recommend, but NEVER send direct to customer.
 */
export async function analyzeLeadMessage(input: LeadAnalysisInput): Promise<LeadAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const ruleData = extractRuleSignals(input.messageText);

  // Fallback jika API key belum diisi pengguna
  if (!apiKey || apiKey.trim() === "") {
    console.warn("[LeadAnalyzer] GEMINI_API_KEY belum diatur. Menggunakan parser cerdas lokal.");
    return fallbackLocalAnalysis(input, ruleData);
  }

  const ai = new GoogleGenAI({ apiKey });

  const promptKonteks = `
Kamu adalah Analis CRM & Customer Service AI cerdas untuk Foxe Studio (Studio Foto profesional: Photofox Self Photo Box, Wisuda/Graduation, Couple, Family, Group).
Tugasmu adalah menganalisis pesan masuk WhatsApp dari pelanggan, mengklasifikasi intent, sentimen, lead score (0-100), suhu lead (COLD/WARM/HOT), dan draf balasan untuk CS (Human-In-The-Loop).

Informasi Konteks:
- Pengirim: ${input.senderName || "Belum dikenal"} (${input.senderNumber})
- Status Kontak: ${input.isExistingLead ? "Pelanggan Lama" : "Lead Baru"}
- Riwayat/Konteks Lama: ${input.leadContext || "Belum ada catatan"}
- Status Booking Sebelumnya: ${input.hasBooking ? "Pernah booking" : "Belum pernah"}
- Admin Bertugas Saat Ini: ${input.currentAdminShift?.adminName || "Admin CS"}
- Sinyal Rule Terdeteksi: ${ruleData.signals.length > 0 ? ruleData.signals.join(", ") : "Tidak ada"}
- Indikasi Dekat Booking: ${ruleData.isNearBooking ? "YA (Tanya DP/Rekening)" : "Belum"}

Pesan Pelanggan:
"""
${input.messageText}
"""

Aturan Scoring & Penilaian (Modul 06):
1. Lead Score (0 - 100):
   - 0-30 = COLD (Hanya salam, info sangat umum, atau tidak jelas)
   - 31-65 = WARM (Tanya harga, paket, pricelist, atau ketersediaan umum)
   - 66-100 = HOT (Tanya tanggal spesifik, tanya slot jam, tanya rekening/DP, atau komplain mendesak)
2. Follow Up Default Rule:
   - HOT: followUpDays = 1 (H+1)
   - WARM: followUpDays = 3 (H+3)
   - COLD: followUpDays = 7 (H+7)
3. Buatkan recommendedReply yang ramah, sopan, bernada anak muda/modern khas Foxe Studio, dan solutif.
4. Set needsDeepAnalysis = true jika pesan ambigu, komplain serius, atau butuh negosiasi closing penting.
`;

  try {
    // TIER 1: Analisis Rutin (gemini-2.5-flash)
    const tier1Response = await Promise.race([
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: promptKonteks,
        config: {
          responseMimeType: "application/json",
          responseSchema: analysisResponseSchema,
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Gemini Tier 1 Timeout")), 8000)
      ),
    ]);

    const parsedData = JSON.parse(tier1Response.text || "{}");

    // Hybrid Lead Scoring: Gabungkan Rule Score + AI Score
    const aiScore = typeof parsedData.leadScore === "number" ? parsedData.leadScore : ruleData.ruleScore;
    const finalLeadScore = Math.min(Math.max(Math.round((aiScore * 0.6) + (ruleData.ruleScore * 0.4)), 10), 100);

    let finalTemperature: "COLD" | "WARM" | "HOT" = "COLD";
    if (finalLeadScore >= 66 || ruleData.isNearBooking) {
      finalTemperature = "HOT";
    } else if (finalLeadScore >= 31) {
      finalTemperature = "WARM";
    }

    // Evaluasi apakah perlu Tier 2 (Deep Reasoning jika komplain / high intent closing / ambiguous)
    let usedStrongAi = false;
    let finalReply = parsedData.recommendedReply;
    const finalSummary = parsedData.summary;

    if (
      parsedData.needsDeepAnalysis ||
      parsedData.urgencyScore >= 5 ||
      parsedData.intentCategory === "KOMPLAIN" ||
      ruleData.isNearBooking
    ) {
      try {
        console.log("[LeadAnalyzer] Mengekskalasi pesan ke Tier 2 (Strong LLM Deep Reasoning)...");
        const tier2Prompt = `
Konteks Analisis Sebelumnya:
- Kategori: ${parsedData.intentCategory}
- Masalah/Kebutuhan: ${parsedData.summary}
- Sinyal: ${ruleData.signals.join(", ")}
- Suhu Lead: ${finalTemperature} (${finalLeadScore}/100)
- Pesan Asli Pelanggan: "${input.messageText}"

Tugas Senior CS Strategist Foxe Studio:
Berikan rekomendasi draf balasan terbaik untuk CS yang ramah, empati, dan persuasif agar deal tercapai atau komplain tuntas dengan memuaskan. Balas langsung teks pesannya tanpa kata pengantar.
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

    const isHighPriority =
      Boolean(parsedData.isHighPriority) ||
      finalTemperature === "HOT" ||
      ruleData.isNearBooking ||
      parsedData.urgencyScore >= 4;

    return {
      intentCategory: parsedData.intentCategory || "INFO_UMUM",
      sentiment: parsedData.sentiment || "NETRAL",
      urgencyScore: parsedData.urgencyScore ?? (finalTemperature === "HOT" ? 4 : 2),
      leadScore: finalLeadScore,
      temperature: finalTemperature,
      ruleSignals: ruleData.signals,
      summary: finalSummary || "Pesan dari pelanggan Foxe Studio",
      recommendedReply: finalReply || "Halo kak! Terima kasih sudah menghubungi Foxe Studio. Ada yang bisa kami bantu kak?",
      suggestedAction: parsedData.suggestedAction || (finalTemperature === "HOT" ? "Segera kirimkan form booking / slot jadwal" : "Kirimkan pricelist & katalog paket"),
      priorityReason: parsedData.priorityReason || (isHighPriority ? "Sinyal pembelian tinggi / butuh respon cepat" : "Pertanyaan reguler"),
      followUpDays: parsedData.followUpDays || (finalTemperature === "HOT" ? 1 : finalTemperature === "WARM" ? 3 : 7),
      followUpReason: parsedData.followUpReason || "Konfirmasi kelanjutan pemesanan sesi foto",
      aiConfidence: typeof parsedData.aiConfidence === "number" ? parsedData.aiConfidence : 0.92,
      needsFollowUp: Boolean(parsedData.needsFollowUp) || finalTemperature !== "COLD",
      isHighPriority,
      usedStrongAi,
      extractedName: parsedData.extractedName,
      updatedContextNotes: parsedData.updatedContextNotes,
    };
  } catch (error) {
    console.error("[LeadAnalyzer] Error saat memanggil Gemini API:", error);
    return fallbackLocalAnalysis(input, ruleData);
  }
}

/**
 * Fallback jika API key belum aktif atau koneksi internet terputus
 */
function fallbackLocalAnalysis(
  input: LeadAnalysisInput,
  ruleData: { signals: string[]; ruleScore: number; isNearBooking: boolean }
): LeadAnalysisResult {
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

  const finalLeadScore = ruleData.ruleScore;
  let finalTemperature: "COLD" | "WARM" | "HOT" = "COLD";
  if (finalLeadScore >= 66 || ruleData.isNearBooking || urgencyScore >= 4) {
    finalTemperature = "HOT";
    isHighPriority = true;
  } else if (finalLeadScore >= 31) {
    finalTemperature = "WARM";
    needsFollowUp = true;
  }

  return {
    intentCategory,
    sentiment: intentCategory === "KOMPLAIN" ? "NEGATIF" : "NETRAL",
    urgencyScore,
    leadScore: finalLeadScore,
    temperature: finalTemperature,
    ruleSignals: ruleData.signals,
    summary: `Pesan seputar ${intentCategory.toLowerCase()}: "${input.messageText.slice(0, 80)}..."`,
    recommendedReply: "Halo kak, terima kasih sudah menghubungi Foxe Studio! Pesan kakak sudah kami terima dan admin kami akan segera membantu ya kak 🙏",
    suggestedAction: finalTemperature === "HOT" ? "Kirim ketersediaan slot tanggal & jam" : "Kirim pricelist paket studio",
    priorityReason: isHighPriority ? "Urgent / Sinyal booking kuat" : "Pertanyaan umum",
    followUpDays: finalTemperature === "HOT" ? 1 : finalTemperature === "WARM" ? 3 : 7,
    followUpReason: "Follow up minat paket foto",
    aiConfidence: 0.85,
    needsFollowUp,
    isHighPriority,
    usedStrongAi: false,
    updatedContextNotes: `Minat pada ${intentCategory.toLowerCase()}`,
  };
}
