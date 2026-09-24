import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  LogOrderDPRecord,
  normalizeLogAdmin,
} from "@/lib/services/log-order-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Secret sederhana untuk validasi — diset di Vercel env & di Google Apps Script
const INGEST_SECRET = process.env.LOG_ORDER_INGEST_SECRET || "foxe-log-order-auto-2026";

/**
 * POST /api/crm/ingest-log-order
 *
 * Menerima data DP dari Google Apps Script (READ-ONLY reader) dan menyinkronkan
 * ke database Neon PostgreSQL. TIDAK PERNAH menulis balik ke spreadsheet sumber.
 *
 * Body JSON:
 * {
 *   secret: string,
 *   records: LogOrderDPRecord[],
 *   month: number,     // 1-12
 *   year: number       // 2026
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validasi secret
    if (body.secret !== INGEST_SECRET) {
      return NextResponse.json(
        { status: "error", error: "Unauthorized — secret salah" },
        { status: 401 }
      );
    }

    // 2. Validasi payload
    const records: LogOrderDPRecord[] = body.records;
    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { status: "error", error: "Tidak ada records yang dikirim" },
        { status: 400 }
      );
    }

    console.log(
      `[IngestLogOrder] Menerima ${records.length} records dari Google Apps Script...`
    );

    // 3. Ambil seluruh lead di database
    const existingLeads = await prisma.lead.findMany({
      include: {
        interactions: {
          select: { messageText: true, ruleSignals: true },
        },
      },
    });

    const matchedDetails: Array<{
      dpClient: string;
      day: number;
      leadName: string;
      phone: string;
    }> = [];
    const createdDetails: Array<{
      client: string;
      day: number;
      paket: string;
      nominal: number;
    }> = [];
    const skippedDetails: Array<{ client: string; day: number; reason: string }> = [];

    let totalDPRevenue = 0;

    for (let idx = 0; idx < records.length; idx++) {
      const dp = records[idx];

      // Validasi minimal
      if (!dp.client || !dp.day) {
        skippedDetails.push({
          client: dp.client || "(kosong)",
          day: dp.day || 0,
          reason: "Data tidak lengkap (client/day kosong)",
        });
        continue;
      }

      const adminName = normalizeLogAdmin(dp.admin);
      const nominal = dp.nominal > 0 ? dp.nominal : 100000;
      totalDPRevenue += nominal;

      const formattedNominal = nominal.toLocaleString("id-ID");
      const bookingNote = `DP via Transfer Rp ${formattedNominal} (Paket: ${dp.paket}, Tgl Foto: ${dp.tgl_foto || "-"}) - Log Order Day ${dp.day} [${adminName}]`;
      const dpDateObj = new Date(`${dp.date}T12:00:00+07:00`);

      // ---- Smart Matching: Cari kontak WA yang cocok ----
      const matchedLead = findMatchingLead(dp.client, existingLeads);

      if (matchedLead) {
        // Cek apakah lead ini sudah pernah di-sync untuk hari yang sama
        const alreadySynced = matchedLead.interactions.some(
          (i) =>
            i.ruleSignals?.includes(`DP_DAY_${dp.day}`) &&
            i.ruleSignals?.includes("LOG_ORDER_DP")
        );

        if (alreadySynced) {
          skippedDetails.push({
            client: dp.client,
            day: dp.day,
            reason: `Sudah tersinkron sebelumnya (matched: ${matchedLead.name})`,
          });
          continue;
        }

        // UPDATE lead WA yang ada menjadi KONVERSI RESMI (DP)
        await prisma.lead.update({
          where: { id: matchedLead.id },
          data: {
            status: "BOOKING",
            hasBooking: true,
            temperature: "HOT",
            leadScore: 100,
            revenue:
              matchedLead.revenue && matchedLead.revenue > 0
                ? matchedLead.revenue
                : nominal,
            bookingNotes: bookingNote,
            closingAdmin: adminName,
            followUpDate: null,
            lastBookingDate: dpDateObj,
          },
        });

        // Tambah interaksi konfirmasi DP
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
            ruleSignals: `LOG_ORDER_DP, PAYMENT_RECEIPT_VERIFIED, DP, DP_DAY_${dp.day}, NOMINAL_${nominal}, CS_${adminName}`,
            summary: `[DP SAH LOG ORDER] DP Rp ${formattedNominal} via Transfer tercatat di Log Order (${dp.paket})`,
            recommendedReply: `Halo Kak ${matchedLead.name || dp.client}! Pembayaran DP sebesar Rp ${formattedNominal} untuk paket ${dp.paket} sudah kami konfirmasi dan tercatat di sistem Foxe Studio yaa. Slot foto tanggal ${dp.tgl_foto} resmi kami amankan! Sampai jumpa di studio 📸✨`,
            suggestedAction:
              "Jadwal dan slot foto telah terkunci sesuai Log Order studio.",
            needsFollowUp: false,
            isHighPriority: true,
            handledByAdmin: adminName,
            createdAt: dpDateObj,
          },
        });

        matchedDetails.push({
          dpClient: dp.client,
          day: dp.day,
          leadName: matchedLead.name || dp.client,
          phone: matchedLead.phoneNumber,
        });
      } else {
        // Buat record baru (klien belum ada di WA) — Synthetic phone prefix 62800
        const syntheticPhone = `62800${String(dp.day).padStart(2, "0")}${String(idx + 1).padStart(3, "0")}`;

        const alreadyExists = await prisma.lead.findFirst({
          where: {
            OR: [
              { phoneNumber: syntheticPhone },
              { name: dp.client, source: "LOG_ORDER" },
            ],
          },
        });

        if (alreadyExists) {
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
          skippedDetails.push({
            client: dp.client,
            day: dp.day,
            reason: "Record synthetic sudah ada, di-update",
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
              contextNotes: `Klien DP terdaftar di Log Order Studio (Sheet Tgl ${dp.day}). Paket: ${dp.paket}, Sesi Foto: ${dp.tgl_foto || "-"}`,
              lastBookingDate: dpDateObj,
              createdAt: dpDateObj,
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
              ruleSignals: `LOG_ORDER_DP, PAYMENT_RECEIPT_VERIFIED, DP, DP_DAY_${dp.day}, NOMINAL_${nominal}, CS_${adminName}`,
              summary: `[DP SAH] DP Rp ${formattedNominal} via Transfer tercatat di Log Order (${dp.paket})`,
              recommendedReply: `Halo Kak ${dp.client}! Terima kasih telah melakukan pembayaran DP untuk sesi ${dp.paket} di Foxe Studio. Jadwal foto tanggal ${dp.tgl_foto || "-"} sudah kami amankan! Sampai jumpa di studio 📸✨`,
              suggestedAction:
                "Slot foto terkunci sesuai data pembukuan kasir.",
              needsFollowUp: false,
              isHighPriority: true,
              handledByAdmin: adminName,
              createdAt: dpDateObj,
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

    const result = {
      status: "success",
      message: `Berhasil: ${matchedDetails.length} matched WA, ${createdDetails.length} baru, ${skippedDetails.length} skip`,
      totalReceived: records.length,
      matchedCount: matchedDetails.length,
      createdCount: createdDetails.length,
      skippedCount: skippedDetails.length,
      totalDPRevenue,
      matchedDetails,
      createdDetails,
      skippedDetails,
    };

    console.log(
      `[IngestLogOrder] Selesai — Matched: ${matchedDetails.length}, Created: ${createdDetails.length}, Skipped: ${skippedDetails.length}`
    );

    return NextResponse.json(result);
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : "Internal Server Error";
    console.error("[IngestLogOrder] Fatal error:", error);
    return NextResponse.json(
      { status: "error", error: errMsg },
      { status: 500 }
    );
  }
}

// ---- Smart Matching Logic (sama dengan log-order-sync.ts) ----

function findMatchingLead(
  clientName: string,
  leads: Array<{
    id: string;
    name: string | null;
    phoneNumber: string;
    revenue?: number | null;
    interactions: Array<{
      messageText: string | null;
      ruleSignals?: string | null;
    }>;
  }>
) {
  const cClean = clientName.toLowerCase().trim();
  const cWords = cClean
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  // Hanya cocokkan dengan chat WA ASLI
  const realLeads = leads.filter((l) => !l.phoneNumber.startsWith("62800"));

  // Special cases
  if (
    (cClean === "anin" || cWords.includes("anin")) &&
    realLeads.some((l) => (l.name || "").toLowerCase().includes("aninditya"))
  ) {
    return (
      realLeads.find((l) =>
        (l.name || "").toLowerCase().includes("aninditya")
      ) || null
    );
  }
  if (
    (cClean === "tiara" || cWords.includes("tiara")) &&
    realLeads.some((l) =>
      (l.name || "").toLowerCase().includes("tiararamadhani")
    )
  ) {
    return (
      realLeads.find((l) =>
        (l.name || "").toLowerCase().includes("tiararamadhani")
      ) || null
    );
  }
  if (
    (cClean === "sabna" || cWords.includes("sabna")) &&
    realLeads.some((l) => (l.name || "").toLowerCase().includes("sabna"))
  ) {
    return (
      realLeads.find((l) => (l.name || "").toLowerCase().includes("sabna")) ||
      null
    );
  }
  if (
    (cClean === "nana tri" ||
      (cWords.includes("nana") && cWords.includes("tri"))) &&
    realLeads.some((l) => (l.name || "").toLowerCase().includes("nana"))
  ) {
    return (
      realLeads.find((l) => (l.name || "").toLowerCase().includes("nana")) ||
      null
    );
  }
  if (
    (cClean.includes("sembilan") || cWords.includes("sembilan")) &&
    realLeads.some((l) => l.phoneNumber === "6282220421960")
  ) {
    return realLeads.find((l) => l.phoneNumber === "6282220421960") || null;
  }
  if (
    (cClean.includes("bela") ||
      cWords.includes("amarwati") ||
      cWords.includes("bela")) &&
    realLeads.some((l) => l.phoneNumber === "628152568077")
  ) {
    return realLeads.find((l) => l.phoneNumber === "628152568077") || null;
  }
  if (
    (cClean.includes("rio") ||
      cWords.includes("furqon") ||
      cWords.includes("rio")) &&
    realLeads.some((l) => l.phoneNumber === "6281215826845")
  ) {
    return realLeads.find((l) => l.phoneNumber === "6281215826845") || null;
  }

  for (const lead of realLeads) {
    const lName = (lead.name || "").toLowerCase().trim();
    const lClean = lName.replace(/[^a-z0-9]/g, "");
    const lWords = lName
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3);

    if (lClean && lClean === cClean.replace(/[^a-z0-9]/g, "")) {
      return lead;
    }

    const hasSharedExactWord = cWords.some(
      (cw) => cw.length >= 4 && lWords.some((lw) => lw === cw)
    );
    if (hasSharedExactWord) {
      return lead;
    }

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
  }

  return null;
}
