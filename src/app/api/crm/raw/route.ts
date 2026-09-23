import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Endpoint untuk mendapatkan RAW DATA seluruh leads dan interaksi
 * yang sudah diurutkan berdasarkan PRIORITAS TERTINGGI (Urgensi 5/5 -> 1/5)
 */
export async function GET() {
  try {
    const rawLeads = await prisma.lead.findMany({
      include: {
        interactions: {
          orderBy: [
            { isHighPriority: "desc" },
            { urgencyScore: "desc" },
            { createdAt: "desc" },
          ],
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Format data terstruktur dengan urutan prioritas jelas
    const prioritizedList = rawLeads
      .map((lead) => {
        const topInteraction = lead.interactions[0];
        const maxUrgency = Math.max(...lead.interactions.map((i) => i.urgencyScore), 1);
        const hasHighPriority = lead.interactions.some((i) => i.isHighPriority);

        return {
          leadId: lead.id,
          phoneNumber: lead.phoneNumber,
          name: lead.name || "Tanpa Nama",
          status: lead.status,
          source: lead.source,
          priorityRanking: hasHighPriority ? "URGENT_1" : `LEVEL_${maxUrgency}`,
          maxUrgencyScore: maxUrgency,
          isHighPriority: hasHighPriority,
          needsFollowUp: lead.interactions.some((i) => i.needsFollowUp),
          hasBooking: lead.hasBooking,
          contextNotes: lead.contextNotes,
          latestMessage: topInteraction?.messageText || null,
          aiSummary: topInteraction?.summary || null,
          recommendedReply: topInteraction?.recommendedReply || null,
          latestIntent: topInteraction?.intentCategory || null,
          sentiment: topInteraction?.sentiment || null,
          totalInteractions: lead.interactions.length,
          allInteractionsRaw: lead.interactions,
          lastUpdatedAt: lead.updatedAt,
        };
      })
      .sort((a, b) => {
        // Urutkan: High Priority dulu, lalu skor urgensi 5 -> 1
        if (a.isHighPriority && !b.isHighPriority) return -1;
        if (!a.isHighPriority && b.isHighPriority) return 1;
        return b.maxUrgencyScore - a.maxUrgencyScore;
      });

    return NextResponse.json(
      {
        totalLeads: prioritizedList.length,
        urgentCount: prioritizedList.filter((l) => l.isHighPriority).length,
        data: prioritizedList,
      },
      {
        status: 200,
        headers: {
          "Content-Disposition": 'inline; filename="raw_leads_prioritized.json"',
        },
      }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Error fetching raw data";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
