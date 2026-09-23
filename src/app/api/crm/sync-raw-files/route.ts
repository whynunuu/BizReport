import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PACKAGE_PRICES: Record<string, number> = {
  Photofox: 200000,
  "Self Photo": 200000,
  Graduation: 350000,
  "Graduation Premium": 500000,
  "Family A": 400000,
  "Family B": 500000,
  "Couple A": 250000,
  "Couple B": 350000,
  "Couple C": 450000,
  "Pas Foto": 50000,
  Single: 100000,
  "Large Group": 250000,
};

function normalizePhone(phone: string): string {
  let clean = phone.replace(/[^0-9]/g, "");
  if (clean.startsWith("0")) {
    clean = "62" + clean.substring(1);
  } else if (!clean.startsWith("62")) {
    clean = "62" + clean;
  }
  return clean;
}

export async function POST(req: NextRequest) {
  try {
    const jobs = await prisma.photoDeliveryJob.findMany({
      orderBy: { createdAt: "desc" },
    });

    const syncedResults = [];

    for (const job of jobs) {
      const cleanPhone = normalizePhone(job.phoneNumber);
      const estPrice = PACKAGE_PRICES[job.packageType] || 200000;
      const note = `Paket ${job.packageType} (${job.status}) - Terdaftar di Raw Files Hub`;

      let lead = await prisma.lead.findUnique({
        where: { phoneNumber: cleanPhone },
        include: { interactions: true },
      });

      if (!lead) {
        // Buat lead baru berstatus BOOKING
        lead = await prisma.lead.create({
          data: {
            phoneNumber: cleanPhone,
            name: job.clientName,
            status: "BOOKING",
            hasBooking: true,
            temperature: "HOT",
            leadScore: 100,
            revenue: estPrice,
            bookingNotes: note,
            lastBookingDate: job.sessionDate || new Date(),
            leadOwner: "Admin Studio",
            contextNotes: `Klien sesi foto terdaftar di Raw Files Hub. Paket: ${job.packageType}`,
            interactions: {
              create: {
                direction: "INBOUND",
                messageText: `[RAW FILES HUB] Sesi photoshoot paket ${job.packageType} terdaftar (${job.status}). Link Drive: ${job.driveUrl || "Menunggu Upload"}`,
                intentCategory: "BOOKING",
                sentiment: "POSITIF",
                urgencyScore: 5,
                leadScore: 100,
                temperature: "HOT",
                ruleSignals: "RAW_FILES_JOB, PAYMENT_VERIFIED",
                summary: `Sesi foto ${job.packageType} telah terkonfirmasi dan terdaftar di antrean Raw Files Hub`,
                recommendedReply: `Halo Kak ${job.clientName}! Sesi foto ${job.packageType} kakak sudah terkonfirmasi di sistem kami yaa. Sampai jumpa di Foxe Studio! 📸✨`,
                suggestedAction: "Pantau antrean edit foto dan siapkan pengiriman Google Drive",
                needsFollowUp: false,
                isHighPriority: true,
                handledByAdmin: "Admin Studio",
              },
            },
          },
          include: { interactions: true },
        });
      } else {
        // Update lead yang sudah ada menjadi BOOKING
        lead = await prisma.lead.update({
          where: { id: lead.id },
          data: {
            name: lead.name || job.clientName,
            status: "BOOKING",
            hasBooking: true,
            temperature: "HOT",
            leadScore: 100,
            revenue: lead.revenue && lead.revenue > 0 ? lead.revenue : estPrice,
            bookingNotes: lead.bookingNotes || note,
            lastBookingDate: lead.lastBookingDate || job.sessionDate || new Date(),
          },
          include: { interactions: true },
        });

        // Tambah interaksi jika belum ada interaksi booking
        const hasBookingInteraction = lead.interactions.some((i) =>
          i.ruleSignals?.includes("RAW_FILES_JOB") || i.ruleSignals?.includes("PAYMENT")
        );

        if (!hasBookingInteraction) {
          await prisma.leadInteraction.create({
            data: {
              leadId: lead.id,
              direction: "INBOUND",
              messageText: `[RAW FILES HUB] Sesi photoshoot paket ${job.packageType} terdaftar (${job.status}).`,
              intentCategory: "BOOKING",
              sentiment: "POSITIF",
              urgencyScore: 5,
              leadScore: 100,
              temperature: "HOT",
              ruleSignals: "RAW_FILES_JOB, PAYMENT_VERIFIED",
              summary: `Sesi foto ${job.packageType} telah terkonfirmasi di Raw Files Hub`,
              recommendedReply: `Halo Kak ${job.clientName}! Sesi foto ${job.packageType} kakak sudah terkonfirmasi di sistem kami yaa. Sampai jumpa di Foxe Studio! 📸✨`,
              suggestedAction: "Pantau antrean edit foto dan pengiriman link Google Drive",
              needsFollowUp: false,
              isHighPriority: true,
              handledByAdmin: "Admin Studio",
            },
          });
        }
      }

      syncedResults.push({
        jobId: job.id,
        clientName: job.clientName,
        phone: cleanPhone,
        packageType: job.packageType,
        revenue: estPrice,
      });
    }

    return NextResponse.json({
      status: "success",
      syncedCount: syncedResults.length,
      data: syncedResults,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[SyncRawFiles] Error:", error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
