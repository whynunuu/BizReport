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
  recommendedReply: string; // Draf balasan untuk CS yang sangat human, ramah, dan kontekstual (Human-In-The-Loop)
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
  if (/bisa|ready|kosong|tersedia|ada slot|bisa booking|masih ada|avail/.test(lower)) {
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
      description: "Draf balasan WhatsApp yang SANGAT MANUSIAWI, RAMAH, KASUAL TAPI SOPAN (gaya CS studio foto anak muda). JANGAN PERNAH gunakan kalimat kaku robot seperti 'Pesan kakak sudah kami terima' atau 'admin akan membantu'. Langsung jawab konteks dengan solutif dan tawarkan langkah berikutnya.",
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
 * 2-Tier AI Engine Analyzer dengan Human Tone Learning:
 * Tier 1: Gemini 2.5 Flash
 * Tier 2: Deep reasoning escalation untuk closing / komplain / negosiasi
 * Output recommendedReply menggunakan bahasa Indonesia natural, hangat, khas CS studio foto.
 */
export async function analyzeLeadMessage(input: LeadAnalysisInput): Promise<LeadAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const ruleData = extractRuleSignals(input.messageText);

  if (!apiKey || apiKey.trim() === "") {
    console.warn("[LeadAnalyzer] GEMINI_API_KEY belum diatur. Menggunakan parser kontekstual lokal.");
    return fallbackLocalAnalysis(input, ruleData);
  }

  const ai = new GoogleGenAI({ apiKey });

  const promptKonteks = `
Kamu adalah Senior CS Specialist di Foxe Studio, sebuah studio foto kekinian dan profesional di Indonesia.
Kamu bertugas membedah pesan WhatsApp masuk dari calon klien dan membuat draf balasan untuk Admin CS.

Katalog & Pricelist Resmi Foxe Studio (Gunakan sebagai acuan respon):
1. Photofox (Self Photo Box): Rp 200.000 (bebas jepret sepuasnya, cocok buat bestie/couple)
2. Graduation: Rp 350.000 (sesi wisuda studio standar)
3. Graduation Premium: Rp 500.000 (sesi wisuda lengkap + full editing retouch + cetak 4R)
4. Pas Foto: Rp 50.000 (resmi, background ganti cepat)
5. Single Portrait: Rp 100.000
6. Large Group: Rp 25.000/pax (ramean teman kelas/organisasi)
7. Couple & Family: Tersedia Paket A, B, dan C

PEDOMAN GAYA BAHASA CS FOXE STUDIO (WAJIB HUMAN, ANTI-ROBOT!):
❌ DILARANG KERAS MENGGUNAKAN TEMPLATE BOT KAKU SEPERTI:
- "Terima kasih telah menghubungi Foxe Studio"
- "Pesan Anda telah kami terima dan akan segera dibalas oleh admin kami"
- "Mohon menunggu bantuan dari staf kami"
- "Ada yang bisa saya bantu terkait kebutuhan Anda?"

✅ WAJIB MENGGUNAKAN GAYA BAHASA SEPERTI MANUSIA ASLI:
- Sapaan ramah & hangat: "Halo Kak [Nama]! ✨", "Hai kak!", "Halo kak, salam kenal yaa"
- Langsung to the point menjawab apa yang ditanyakan customer dengan ramah dan solutif.
- Jika tanya harga / paket: sebutkan harganya dengan jelas, beri keunggulan singkat, lalu ajak interaksi (tanya tanggal/jumlah orang).
- Jika tanya ketersediaan / jadwal / slot: sampaikan bahwa slot masih ada dan tanyakan preferensi jamnya.
- Jika kirim pertanyaan singkat ("avail ngga?", "kak", "p"): sapa balik dengan ceria dan tanyakan rencana fotonya.
- Jika ada komplain / kendala: tunjukkan empati tinggi, minta maaf dengan tulus, dan tawarkan solusi konkret segera.
- Nada bicara: santai, sopan, antusias, tidak bertele-tele, memakai emoji secukupnya (📸, ✨, 😊, 🎓).

Informasi Kontak Saat Ini:
- Nama Pengirim: ${input.senderName || "Kakak"} (${input.senderNumber})
- Status Kontak: ${input.isExistingLead ? "Pelanggan Lama" : "Lead Baru"}
- Riwayat Konteks: ${input.leadContext || "Belum ada"}
- Pernah Booking: ${input.hasBooking ? "Pernah" : "Belum"}
- Shift Admin: ${input.currentAdminShift?.adminName || "Admin CS"}
- Sinyal Kata Kunci: ${ruleData.signals.length > 0 ? ruleData.signals.join(", ") : "Tidak ada"}
- Dekat Booking: ${ruleData.isNearBooking ? "YA (Menanyakan pembayaran/DP/rekening)" : "Belum"}

Isi Pesan Masuk Pelanggan:
"""
${input.messageText}
"""

Aturan Scoring:
- Score 0-30 (COLD): Salam singkat / tidak ada konteks.
- Score 31-65 (WARM): Tanya harga, paket, atau info umum.
- Score 66-100 (HOT): Tanya tanggal spesifik, slot jam, mau DP/booking, atau komplain.
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

    let usedStrongAi = false;
    let finalReply = parsedData.recommendedReply;
    const finalSummary = parsedData.summary;

    // Evaluasi apakah perlu Tier 2 jika komplain berat atau negosiasi besar
    if (
      parsedData.needsDeepAnalysis ||
      parsedData.urgencyScore >= 5 ||
      parsedData.intentCategory === "KOMPLAIN"
    ) {
      try {
        console.log("[LeadAnalyzer] Mengekskalasi pesan ke Tier 2 (Deep Reasoning)...");
        const tier2Prompt = `
Kamu adalah CS Lead Foxe Studio. Pelanggan ini butuh penanganan khusus (komplain/urgensi tinggi/negosiasi).
Pesan Pelanggan: "${input.messageText}"
Masalah/Konteks: ${parsedData.summary}

Buat 1 draf balasan WhatsApp yang sangat tulus, empatik, menyelesaikan masalah, dan bersahabat. Langsung teks balasan tanpa basa-basi pembuka.
`;
        const tier2Response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: tier2Prompt,
        });

        if (tier2Response.text) {
          finalReply = tier2Response.text.trim();
          usedStrongAi = true;
        }
      } catch (err) {
        console.warn("[LeadAnalyzer] Tier 2 fallback ke Tier 1:", err);
      }
    }

    const isHighPriority =
      Boolean(parsedData.isHighPriority) ||
      finalTemperature === "HOT" ||
      ruleData.isNearBooking ||
      parsedData.urgencyScore >= 4;

    const callerName = parsedData.extractedName || input.senderName || "Kak";

    return {
      intentCategory: parsedData.intentCategory || "INFO_UMUM",
      sentiment: parsedData.sentiment || "NETRAL",
      urgencyScore: parsedData.urgencyScore ?? (finalTemperature === "HOT" ? 4 : 2),
      leadScore: finalLeadScore,
      temperature: finalTemperature,
      ruleSignals: ruleData.signals,
      summary: finalSummary || "Pesan masuk dari pelanggan",
      recommendedReply: finalReply || `Halo Kak ${callerName}! Ada yang bisa kami bantu seputar sesi foto di Foxe Studio hari ini? 😊`,
      suggestedAction: parsedData.suggestedAction || (finalTemperature === "HOT" ? "Kirimkan ketersediaan jadwal slot foto" : "Kirimkan katalog paket foto"),
      priorityReason: parsedData.priorityReason || (isHighPriority ? "Minat tinggi / butuh respon cepat" : "Pertanyaan umum"),
      followUpDays: parsedData.followUpDays || (finalTemperature === "HOT" ? 1 : finalTemperature === "WARM" ? 3 : 7),
      followUpReason: parsedData.followUpReason || "Follow up kelanjutan pemesanan",
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
 * Fallback kontekstual manusiawi jika koneksi Gemini timeout / offline
 * Tidak pernah menggunakan kalimat robot!
 */
function fallbackLocalAnalysis(
  input: LeadAnalysisInput,
  ruleData: { signals: string[]; ruleScore: number; isNearBooking: boolean }
): LeadAnalysisResult {
  const text = input.messageText.toLowerCase();
  const callerName = input.senderName || "Kak";

  let intentCategory: LeadAnalysisResult["intentCategory"] = "INFO_UMUM";
  let urgencyScore = 2;
  let needsFollowUp = false;
  let isHighPriority = false;
  let naturalReply = `Halo Kak ${callerName}! Ada yang bisa dibantu seputar sesi foto di Foxe Studio? Boleh cerita rencananya mau foto apa nih kak? 😊`;

  if (/wisuda|graduation/.test(text)) {
    intentCategory = "PRICELIST";
    needsFollowUp = true;
    naturalReply = `Halo Kak ${callerName}! Buat foto graduation yaa? 🎓 Di Foxe Studio ada paket Graduation (350rb) dan Graduation Premium (500rb sudah full edit + cetak 4R). Kakak rencana buat wisuda tanggal berapa nih biar sekalian dicek slotnya? ✨`;
  } else if (/photofox|self photo/.test(text)) {
    intentCategory = "PRICELIST";
    needsFollowUp = true;
    naturalReply = `Halo Kak ${callerName}! Buat Photofox (Self Photo Box) cuma 200rb ya kak, bebas jepret sepuasnya bareng teman atau pasangan! Rencana mau dateng hari apa nih kak biar kami amankan ruangannya? 📸✨`;
  } else if (/harga|pricelist|paket|biaya|tarif|berapa/.test(text)) {
    intentCategory = "PRICELIST";
    needsFollowUp = true;
    naturalReply = `Halo Kak ${callerName}! Untuk paket foto studio kami lengkap banget kak, mulai dari Photofox (200rb), Pas Foto (50rb), Single (100rb), sampai Graduation (350rb-500rb). Kakak lagi cari paket buat sesi apa nih kak? Biar bisa aku rekomendasiin yang paling pas! 😊`;
  } else if (/avail|ready|slot|jadwal|kosong|tanggal|jam/.test(text)) {
    intentCategory = "BOOKING";
    urgencyScore = 4;
    needsFollowUp = true;
    isHighPriority = true;
    naturalReply = `Halo Kak ${callerName}! Masih ready nih kak untuk jadwalnya ✨ Kakak ada preferensi tanggal berapa dan mau sesi jam berapa ya? Biar langsung aku bantu keep slotnya! 📸`;
  } else if (/rekening|transfer|dp|panjar|bayar|tanda jadi/.test(text)) {
    intentCategory = "BOOKING";
    urgencyScore = 5;
    needsFollowUp = true;
    isHighPriority = true;
    naturalReply = `Halo Kak ${callerName}! Siap kak, untuk penguncian jadwal slot bisa transfer DP ke BCA 1234567890 a.n Foxe Studio yaa. Nanti kalau sudah ditransfer tinggal kirim buktinya ke sini ya kak 🙏✨`;
  } else if (/komplain|kecewa|rusak|salah|belum dikirim|lama/.test(text)) {
    intentCategory = "KOMPLAIN";
    urgencyScore = 5;
    needsFollowUp = true;
    isHighPriority = true;
    naturalReply = `Halo Kak ${callerName}, mohon maaf banget ya atas ketidaknyamanannya 🙏 Boleh ceritain detail kendalanya biar langsung kami bantu beresin sekarang juga ya kak?`;
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
    summary: `Pesan seputar ${intentCategory.toLowerCase()}: "${input.messageText.slice(0, 80)}"`,
    recommendedReply: naturalReply,
    suggestedAction: finalTemperature === "HOT" ? "Kirim ketersediaan slot tanggal & jam foto" : "Kirimkan detail paket yang ditanyakan",
    priorityReason: isHighPriority ? "Urgent / Sinyal booking kuat" : "Pertanyaan umum",
    followUpDays: finalTemperature === "HOT" ? 1 : finalTemperature === "WARM" ? 3 : 7,
    followUpReason: "Follow up minat paket foto",
    aiConfidence: 0.88,
    needsFollowUp,
    isHighPriority,
    usedStrongAi: false,
    updatedContextNotes: `Minat pada ${intentCategory.toLowerCase()}`,
  };
}
