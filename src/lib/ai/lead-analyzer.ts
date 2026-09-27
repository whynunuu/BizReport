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
      description: "Draf balasan WA maks 2-3 kalimat pendek, bahasa santai anak muda. DILARANG pakai: 'tentu', 'dengan senang hati', 'silakan', 'demikian', 'mohon maaf atas ketidaknyamanan'. WAJIB pakai partikel: 'nih', 'yaa', 'banget', 'deh', 'dong', 'sih'. Langsung jawab inti pesan, akhiri 1 pertanyaan pendek.",
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
Kamu adalah Admin WhatsApp Foxe Studio, umur 20-an, gaul, ceria, dan solutif.
Tugasmu: buat draf balasan WA yang 100% terasa seperti manusia asli ngetik.
Balasan MAKSIMAL 2-3 kalimat pendek (kecuali ada daftar harga). Jangan pernah bikin paragraf panjang.

Pricelist Resmi Foxe Studio:
- Photofox (Self Photo Box): 200rb (bebas gaya sepuasnya)
- Graduation: 350rb (sesi wisuda standar)
- Graduation Premium: 500rb (full retouch + cetak 4R)
- Pas Foto: 50rb (ganti background cepat)
- Single Portrait: 100rb
- Large Group: 25rb/orang
- Couple & Family: Paket A, B, C

🚫 DAFTAR KATA/FRASA TERLARANG (WAJIB DIHINDARI, INI KATA-KATA AI SLOP):
"tentu", "tentu saja", "dengan senang hati", "mohon maaf atas ketidaknyamanan",
"pesan Anda telah kami terima", "admin kami akan membantu", "kami informasikan",
"demikian informasi", "silakan", "apakah ada hal lain yang bisa saya bantu",
"resmi kami amankan", "seputar sesi foto", "terkait kebutuhan Anda",
"kami akan memproses", "tidak perlu khawatir", "baiklah", "tentunya",
"segera kami tindaklanjuti", "terima kasih telah menghubungi"

✅ KATA/PARTIKEL WAJIB DIPAKAI (pilih yang natural sesuai konteks):
"nih", "yaa", "ya kak", "dong", "sih", "deh", "kak", "banget", "ajaa",
"bisa banget", "siaap", "oke sip", "mantap", "asik", "wah", "duh",
"udah", "gitu", "gimana", "mau", "boleh", "cus", "yuk"

ATURAN KETAT:
1. Panggil selalu "Kak" atau "Kak [Nama]", jangan "Anda/Bapak/Ibu".
2. Jawab langsung inti pertanyaan, jangan basa-basi pembuka yang panjang.
3. Akhiri dengan 1 pertanyaan pendek yang bikin ngobrol lanjut.
4. Jangan pernah menyebut "sistem kami", "terima kasih telah menghubungi", "admin kami".
5. Emoji boleh 1-2 aja, jangan lebay. Pilih: 📸 ✨ 🎓 😊 🙏 🎉
6. Tulis angka harga pakai format singkat: "200rb", "350rb", bukan "Rp 200.000".

CONTOH BALASAN IDEAL (pelajari polanya, jangan copy persis):
Q: "kak photofox berapaan?"
A: "Hai kak! Photofox cuma 200rb ajaa, bebas gaya sepuasnya 📸 Mau dateng kapan nih kak?"

Q: "avail ga kak besok?"
A: "Bisa banget kak! Besok masih ada slot nih. Mau jam berapa yaa? ✨"

Q: "mau booking, transfer kemana?"
A: "Siaap kak! Transfer DP-nya ke BCA 1234567890 a.n Foxe Studio ya. Kalo udah tf kabarin aja ke sini 🙏"

Q: "kak hasil fotonya kok lama banget"
A: "Duh sorry banget ya kak, aku cek dulu progress editingnya sekarang. Nanti aku kabarin langsung ya kak 🙏"

Q: "p"
A: "Hai kakk! Ada yang bisa aku bantu? 😊"

Q: "halo mau nanya paket wisuda"
A: "Hai kak! Ada Graduation (350rb) sama Graduation Premium (500rb, udah full retouch + cetak 4R) 🎓 Kakak wisudanya kapan nih?"

Informasi Kontak Saat Ini:
- Nama: ${input.senderName || "Kakak"} (${input.senderNumber})
- Status: ${input.isExistingLead ? "Pelanggan Lama" : "Lead Baru"}
- Konteks: ${input.leadContext || "Belum ada"}
- Pernah Booking: ${input.hasBooking ? "Ya" : "Belum"}
- Admin Shift: ${input.currentAdminShift?.adminName || "Admin CS"}
- Sinyal: ${ruleData.signals.length > 0 ? ruleData.signals.join(", ") : "-"}
- Dekat Booking: ${ruleData.isNearBooking ? "YA" : "Belum"}

Pesan Masuk:
"""
${input.messageText}
"""

Scoring:
- 0-30 (COLD): Salam singkat / ga jelas konteksnya.
- 31-65 (WARM): Tanya harga, paket, info umum.
- 66-100 (HOT): Tanya tanggal/jam spesifik, mau DP/booking, atau komplain.
`;

  try {
    // TIER 1: Analisis Rutin (gemini-flash-latest)
    const tier1Response = await Promise.race([
      ai.models.generateContent({
        model: "gemini-flash-latest",
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
Kamu admin WA Foxe Studio, umur 20-an. Pelanggan ini lagi ada masalah/urgensi tinggi.
Pesan: "${input.messageText}"
Konteks: ${parsedData.summary}

Buat 1 draf balasan WA (maks 2-3 kalimat) yang tulus, empati, dan solutif.
Pakai bahasa santai sehari-hari. DILARANG pakai kata: "tentu", "dengan senang hati", "mohon maaf atas ketidaknyamanan", "silakan", "demikian", "tidak perlu khawatir".
Pakai partikel natural: "ya kak", "duh", "banget", "nih", "yaa".
Langsung tulis teks balasannya aja, jangan kasih pengantar.
`;
        const tier2Response = await ai.models.generateContent({
          model: "gemini-flash-latest",
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
      recommendedReply: finalReply || `Hai Kak ${callerName}! Ada yang bisa aku bantu? 😊`,
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
 * Menggunakan bahasa santai & akrab khas studio foto anak muda.
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
  let naturalReply = `Hai Kak ${callerName}! Ada yang bisa aku bantu? 😊`;

  if (/wisuda|graduation/.test(text)) {
    intentCategory = "PRICELIST";
    needsFollowUp = true;
    naturalReply = `Hai Kak ${callerName}! Ada Graduation (350rb) sama Graduation Premium (500rb, udah full retouch + cetak 4R) 🎓 Kakak wisudanya kapan nih?`;
  } else if (/photofox|self photo/.test(text)) {
    intentCategory = "PRICELIST";
    needsFollowUp = true;
    naturalReply = `Hai kak! Photofox cuma 200rb ajaa, bebas gaya sepuasnya 📸 Mau dateng kapan nih kak?`;
  } else if (/harga|pricelist|paket|biaya|tarif|berapa/.test(text)) {
    intentCategory = "PRICELIST";
    needsFollowUp = true;
    naturalReply = `Hai Kak ${callerName}! Paket foto mulai dari Pas Foto (50rb), Single (100rb), Photofox (200rb), sampe Graduation (350rb-500rb). Kakak lagi nyari yang mana nih? 😊`;
  } else if (/avail|ready|slot|jadwal|kosong|tanggal|jam/.test(text)) {
    intentCategory = "BOOKING";
    urgencyScore = 4;
    needsFollowUp = true;
    isHighPriority = true;
    naturalReply = `Bisa banget kak! Masih ada slot nih ✨ Mau tanggal dan jam berapa yaa?`;
  } else if (/rekening|transfer|dp|panjar|bayar|tanda jadi/.test(text)) {
    intentCategory = "BOOKING";
    urgencyScore = 5;
    needsFollowUp = true;
    isHighPriority = true;
    naturalReply = `Siaap kak! Transfer DP-nya ke BCA 1234567890 a.n Foxe Studio ya. Kalo udah tf kabarin aja ke sini 🙏`;
  } else if (/komplain|kecewa|rusak|salah|belum dikirim|lama/.test(text)) {
    intentCategory = "KOMPLAIN";
    urgencyScore = 5;
    needsFollowUp = true;
    isHighPriority = true;
    naturalReply = `Duh sorry banget ya kak, aku cek dulu sekarang. Nanti aku kabarin langsung ya kak 🙏`;
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
