import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeLeadMessage } from "@/lib/ai/lead-analyzer";
import { determineActiveShift, formatCsReplyWithSignature } from "@/lib/services/admin-shift-service";

export async function POST(req: NextRequest) {
  try {
    const { interactionId } = await req.json();

    if (!interactionId) {
      return NextResponse.json({ error: "interactionId wajib diisi" }, { status: 400 });
    }

    const interaction = await prisma.leadInteraction.findUnique({
      where: { id: interactionId },
      include: { lead: true },
    });

    if (!interaction) {
      return NextResponse.json({ error: "Interaksi tidak ditemukan" }, { status: 404 });
    }

    const lead = interaction.lead;
    const activeShift = await determineActiveShift(interaction.messageText);

    // Jalankan Lead Analyzer dengan gaya human terbaru
    const analysis = await analyzeLeadMessage({
      messageText: interaction.messageText,
      senderNumber: lead.phoneNumber,
      senderName: lead.name,
      isExistingLead: true,
      leadContext: lead.contextNotes,
      hasBooking: lead.hasBooking,
      lastBookingDate: lead.lastBookingDate,
      currentAdminShift: {
        adminName: activeShift.adminName,
        phoneNumber: activeShift.phoneNumber,
      },
    });

    // Format dengan signature CS
    const signedReply = formatCsReplyWithSignature(
      analysis.recommendedReply,
      activeShift.adminName
    );

    // Update database
    const updated = await prisma.leadInteraction.update({
      where: { id: interactionId },
      data: {
        intentCategory: analysis.intentCategory,
        sentiment: analysis.sentiment,
        urgencyScore: analysis.urgencyScore,
        leadScore: analysis.leadScore,
        temperature: analysis.temperature,
        summary: analysis.summary,
        recommendedReply: signedReply,
        suggestedAction: analysis.suggestedAction,
        priorityReason: analysis.priorityReason,
        isHighPriority: analysis.isHighPriority,
        handledByAdmin: activeShift.adminName,
      },
    });

    // Update lead profile jika perlu
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        leadScore: analysis.leadScore,
        temperature: analysis.temperature,
      },
    });

    return NextResponse.json({
      status: "success",
      interaction: updated,
      newReply: signedReply,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[ReanalyzeAPI] Error:", error);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
