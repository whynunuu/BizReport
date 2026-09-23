import { prisma } from "../prisma";
import fs from "fs";
import path from "path";

export interface LogOrderDPRecord {
  day: number;
  date: string;
  client: string;
  paket: string;
  tgl_foto: string;
  cash: number;
  transfer: number;
  nominal: number;
  admin: string;
}

export interface SyncLogOrderResult {
  status: "success" | "error";
  totalRecordsInSheet: number;
  matchedCount: number;
  createdCount: number;
  totalDPCount: number;
  totalDPRevenue: number;
  matchedDetails: Array<{ dpClient: string; day: number; leadName: string; phone: string }>;
  createdDetails: Array<{ client: string; day: number; paket: string; nominal: number }>;
  error?: string;
}

/**
 * Normalisasi nama admin studio dari Log Order:
 * AMEL -> Admin 1 (Amel)
 * INDAH -> Admin 2 (Indah)
 */
export function normalizeLogAdmin(rawAdmin: string): string {
  const s = (rawAdmin || "").trim().toUpperCase();
  if (s.includes("AMEL") || s === "1") {
    return "Admin 1 (Amel)";
  }
  if (s.includes("INDAH") || s === "2") {
    return "Admin 2 (Indah)";
  }
  return s ? `Admin ${s}` : "Admin CS";
}

/**
 * Pencocokan cerdas berbasis kata kunci antara nama di Log Order dan lead di CRM
 */
function findMatchingLead(
  clientName: string,
  leads: Array<{
    id: string;
    name: string | null;
    phoneNumber: string;
    revenue?: number | null;
    interactions: Array<{ messageText: string | null; ruleSignals?: string | null }>;
  }>
) {
  const cClean = clientName.toLowerCase().trim();
  const cWords = cClean.replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length >= 3);

  for (const lead of leads) {
    const lName = (lead.name || "").toLowerCase().trim();
    const lClean = lName.replace(/[^a-z0-9]/g, "");
    const lWords = lName.replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length >= 3);

    // 1. Exact match
    if (lClean && lClean === cClean.replace(/[^a-z0-9]/g, "")) {
      return lead;
    }

    // 2. Token overlap (kata dengan panjang >= 4 cocok persis)
    const hasSharedWord = cWords.some((cw) =>
      lWords.some(
        (lw) =>
          lw === cw ||
          (cw.length >= 5 && lw.includes(cw)) ||
          (lw.length >= 5 && cw.includes(lw))
      )
    );
    if (hasSharedWord) {
      return lead;
    }

    // 3. Pengecekan format chat WA (misal pesan bertuliskan "Nama : Anin")
    const inChatFormat = lead.interactions.some((i) => {
      const msg = (i.messageText || "").toLowerCase();
      return (
        msg.includes("nama") &&
        cWords.some((cw) => cw.length >= 4 && msg.includes(cw))
      );
    });
    if (inChatFormat) {
      return lead;
    }

    // 4. Special cases yang teridentifikasi di studio:
    // - "Anin" di Log Order <=> "Aninditya R" di WA
    if (cClean.includes("anin") && lName.includes("aninditya")) {
      return lead;
    }
    // - "Tiara" di Log Order <=> "tiararamadhani" di WA
    if (cClean.includes("tiara") && lName.includes("tiararamadhani")) {
      return lead;
    }
    // - "sabna lutfika" <=> "sabnalutfikaam"
    if (cClean.includes("sabna") && lName.includes("sabna")) {
      return lead;
    }
    // - "Nana Tri" <=> "Nana_"
    if (cClean.includes("nana") && lName.includes("nana")) {
      return lead;
    }
  }

  return null;
}

/**
 * Sinkronisasi data DP dari Log Order manual ke database CRM (Neon PostgreSQL)
 */
export async function syncLogOrderDPs(options?: { onlyDay?: number }): Promise<SyncLogOrderResult> {
  try {
    const jsonPath = path.join(process.cwd(), "src", "data", "log_order_dp.json");
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`File sumber data ${jsonPath} tidak ditemukan.`);
    }

    const rawContent = fs.readFileSync(jsonPath, "utf-8");
    let dpRecords: LogOrderDPRecord[] = JSON.parse(rawContent);

    if (options?.onlyDay) {
      dpRecords = dpRecords.filter((d) => d.day === options.onlyDay);
    }

    // Ambil seluruh lead yang ada di database saat ini
    const existingLeads = await prisma.lead.findMany({
      include: {
        interactions: {
          select: { messageText: true, ruleSignals: true },
        },
      },
    });

    const matchedDetails: Array<{ dpClient: string; day: number; leadName: string; phone: string }> = [];
    const createdDetails: Array<{ client: string; day: number; paket: string; nominal: number }> = [];

    let totalDPRevenue = 0;

    for (let idx = 0; idx < dpRecords.length; idx++) {
      const dp = dpRecords[idx];
      const adminName = normalizeLogAdmin(dp.admin);
      const nominal = dp.nominal > 0 ? dp.nominal : 100000;
      totalDPRevenue += nominal;

      const formattedNominal = nominal.toLocaleString("id-ID");
      const bookingNote = `DP via Transfer Rp ${formattedNominal} (Paket: ${dp.paket}, Tgl Foto: ${dp.tgl_foto || "-"}) - Log Order [${adminName}]`;

      // 1. Cek apakah ada kecocokan dengan kontak WhatsApp yang sudah ada
      const matchedLead = findMatchingLead(dp.client, existingLeads);

      if (matchedLead) {
        // UPDATE lead WA yang ada menjadi KONVERSI RESMI (DP)
        await prisma.lead.update({
          where: { id: matchedLead.id },
          data: {
            status: "BOOKING",
            hasBooking: true,
            temperature: "HOT",
            leadScore: 100,
            revenue: (matchedLead.revenue && matchedLead.revenue > 0) ? matchedLead.revenue : nominal,
            bookingNotes: bookingNote,
            closingAdmin: adminName,
            followUpDate: null,
            lastBookingDate: new Date(),
          },
        });

        // Tambah interaksi konfirmasi DP jika belum ada
        const hasExistingDpInteraction = matchedLead.interactions.some(
          (i) =>
            i.ruleSignals?.includes("LOG_ORDER_DP") ||
            (i.messageText && i.messageText.includes("Log Order"))
        );

        if (!hasExistingDpInteraction) {
          await prisma.leadInteraction.create({
            data: {
              leadId: matchedLead.id,
              direction: "INBOUND",
              messageText: `[LOG ORDER DP SAH] Pembayaran DP sebesar Rp ${formattedNominal} via Transfer telah terverifikasi di Log Order Studio (Paket: ${dp.paket}, Jadwal: ${dp.tgl_foto}). Ditangani oleh ${adminName}.`,
              intentCategory: "BOOKING",
              sentiment: "POSITIF",
              urgencyScore: 5,
              leadScore: 100,
              temperature: "HOT",
              ruleSignals: `LOG_ORDER_DP, PAYMENT_RECEIPT_VERIFIED, DP, NOMINAL_${nominal}, CS_${adminName}`,
              summary: `[DP SAH LOG ORDER] DP Rp ${formattedNominal} via Transfer tercatat di Log Order (${dp.paket})`,
              recommendedReply: `Halo Kak ${matchedLead.name || dp.client}! Pembayaran DP sebesar Rp ${formattedNominal} untuk paket ${dp.paket} sudah kami konfirmasi dan tercatat di sistem Foxe Studio yaa. Slot foto tanggal ${dp.tgl_foto} resmi kami amankan! Sampai jumpa di studio 📸✨`,
              suggestedAction: "Jadwal dan slot foto telah terkunci sesuai Log Order studio.",
              needsFollowUp: false,
              isHighPriority: true,
              handledByAdmin: adminName,
            },
          });
        }

        matchedDetails.push({
          dpClient: dp.client,
          day: dp.day,
          leadName: matchedLead.name || dp.client,
          phone: matchedLead.phoneNumber,
        });
      } else {
        // 2. Klien belum ada di chat WhatsApp -> Buat record Lead baru dari Log Order
        // Format nomor telepon unik untuk identifikasi data Log Order: 62800 + [Day 2 digit] + [Index 3 digit]
        const syntheticPhone = `62800${String(dp.day).padStart(2, "0")}${String(idx + 1).padStart(3, "0")}`;

        // Cek jika nomor atau nama klien sudah pernah di-insert
        const alreadyExists = await prisma.lead.findFirst({
          where: {
            OR: [
              { phoneNumber: syntheticPhone },
              { name: dp.client, source: "LOG_ORDER" },
            ],
          },
        });

        if (alreadyExists) {
          // Update status & notes
          await prisma.lead.update({
            where: { id: alreadyExists.id },
            data: {
              status: "BOOKING",
              hasBooking: true,
              revenue: nominal,
              bookingNotes: bookingNote,
              closingAdmin: adminName,
            },
          });
        } else {
          const newLead = await prisma.lead.create({
            data: {
              name: dp.client,
              phoneNumber: syntheticPhone,
              status: "BOOKING",
              source: "LOG_ORDER",
              hasBooking: true,
              revenue: nominal,
              bookingNotes: bookingNote,
              leadOwner: adminName,
              closingAdmin: adminName,
              leadScore: 100,
              temperature: "HOT",
              contextNotes: `Klien DP terdaftar di Log Order Studio (Sheet Tgl ${dp.day} September 2026). Paket: ${dp.paket}, Sesi Foto: ${dp.tgl_foto || "-"}`,
              lastBookingDate: new Date(),
            },
          });

          await prisma.leadInteraction.create({
            data: {
              leadId: newLead.id,
              direction: "INBOUND",
              messageText: `[LOG ORDER DP] Booking paket ${dp.paket} terjadwal tanggal ${dp.tgl_foto || "-"}. Pembayaran DP Rp ${formattedNominal} via Transfer terverifikasi di Log Order.`,
              intentCategory: "BOOKING",
              sentiment: "POSITIF",
              urgencyScore: 5,
              leadScore: 100,
              temperature: "HOT",
              ruleSignals: `LOG_ORDER_DP, PAYMENT_RECEIPT_VERIFIED, DP, NOMINAL_${nominal}, CS_${adminName}`,
              summary: `[DP SAH] DP Rp ${formattedNominal} via Transfer tercatat di Log Order (${dp.paket})`,
              recommendedReply: `Halo Kak ${dp.client}! Terima kasih telah melakukan pembayaran DP untuk sesi ${dp.paket} di Foxe Studio. Jadwal foto tanggal ${dp.tgl_foto || "-"} sudah kami amankan! Sampai jumpa di studio 📸✨`,
              suggestedAction: "Slot foto terkunci sesuai data pembukuan kasir.",
              needsFollowUp: false,
              isHighPriority: true,
              handledByAdmin: adminName,
            },
          });

          createdDetails.push({
            client: dp.client,
            day: dp.day,
            paket: dp.paket,
            nominal,
          });
        }
      }
    }

    return {
      status: "success",
      totalRecordsInSheet: dpRecords.length,
      matchedCount: matchedDetails.length,
      createdCount: createdDetails.length,
      totalDPCount: matchedDetails.length + createdDetails.length,
      totalDPRevenue,
      matchedDetails,
      createdDetails,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Gagal sinkron Log Order";
    console.error("[SyncLogOrder] Error:", error);
    return {
      status: "error",
      totalRecordsInSheet: 0,
      matchedCount: 0,
      createdCount: 0,
      totalDPCount: 0,
      totalDPRevenue: 0,
      matchedDetails: [],
      createdDetails: [],
      error: errMsg,
    };
  }
}
