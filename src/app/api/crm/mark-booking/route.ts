import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { determineActiveShift } from "@/lib/services/admin-shift-service";

export async function POST(req: NextRequest) {
  try {
    const { leadId, paymentType = "DP", amount = 150000, bankName = "BCA", notes = "" } = await req.json();

    if (!leadId) {
      return NextResponse.json({ error: "leadId wajib diisi" }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead tidak ditemukan" }, { status: 404 });
    }

    const activeShift = await determineActiveShift("booking transfer");
    const numAmount = Number(amount) || 0;
    const formattedAmount = numAmount.toLocaleString("id-ID");
    const bookingNote = `${paymentType} via ${bankName} Rp ${formattedAmount}${notes ? ` (${notes})` : ""}`;

    // Update lead ke status BOOKING
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: "BOOKING",
        hasBooking: true,
        temperature: "HOT",
        leadScore: 100,
        revenue: (lead.revenue || 0) + numAmount,
        bookingNotes: bookingNote,
        lastBookingDate: new Date(),
        closingAdmin: activeShift.adminName,
        followUpDate: null, // Stop follow up karena sudah konversi
      },
    });

    // Buat interaksi konfirmasi pembayaran
    const interaction = await prisma.leadInteraction.create({
      data: {
        leadId,
        direction: "INBOUND",
        messageText: `[KONFIRMASI PEMBAYARAN] ${paymentType} via ${bankName} Rp ${formattedAmount}. ${notes}`,
        intentCategory: "BOOKING",
        sentiment: "POSITIF",
        urgencyScore: 5,
        leadScore: 100,
        temperature: "HOT",
        ruleSignals: `MANUAL_PAYMENT_VERIFIED, ${paymentType}, ${bankName}, NOMINAL_${numAmount}`,
        summary: `Pembayaran ${paymentType} Rp ${formattedAmount} via ${bankName} berhasil dikonfirmasi oleh ${activeShift.adminName}`,
        recommendedReply: paymentType === "DP"
          ? `Wah terima kasih banyak Kak ${lead.name || ""}! 🙏 Pembayaran DP-nya sebesar Rp ${formattedAmount} via ${bankName} sudah kami konfirmasi yaa. Slot jadwal fotonya resmi kami amankan! Sisa pelunasannya bisa santai di studio pas hari-H ya kak. Sampai ketemu di Foxe Studio! 📸✨`
          : `Alhamdulillah terima kasih banyak Kak ${lead.name || ""}! 🎉 Pembayaran pelunasannya sebesar Rp ${formattedAmount} via ${bankName} sudah kami terima dengan baik yaa. Semuanya sudah beres dan terkonfirmasi, tinggal dateng dan have fun pas sesi foto nanti. Ditunggu kehadirannya di Foxe Studio ya kak! 📸🥰`,
        suggestedAction: "Jadwalkan slot foto di kalender & siapkan arahan outfit/retouch",
        needsFollowUp: false,
        isHighPriority: true,
        handledByAdmin: activeShift.adminName,
      },
    });

    return NextResponse.json({
      status: "success",
      lead: updatedLead,
      interaction,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[MarkBooking] Error:", error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
