import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOfflineFallbackLeads } from "@/lib/services/offline-fallback";

export const dynamic = "force-dynamic";

/**
 * Endpoint untuk mendapatkan RAW DATA seluruh leads dan interaksi
 * yang sudah diurutkan berdasarkan PRIORITAS TERTINGGI (Urgensi 5/5 -> 1/5)
 * Mendukung ?format=json (default) atau ?format=csv untuk download Excel/Sheet
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";

    let rawLeads: any[] = [];
    try {
      rawLeads = await prisma.lead.findMany({
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
    } catch (dbErr) {
      console.warn("[RawAPI] Database query error, using offline fallback leads:", dbErr);
      rawLeads = getOfflineFallbackLeads();
    }

    // Format data terstruktur dengan urutan prioritas jelas
    const prioritizedList = rawLeads
      .map((lead: any) => {
        const interactions = lead.interactions || [];
        const topInteraction = interactions[0];
        const maxUrgency = Math.max(
          ...interactions.map((i: any) => i.urgencyScore || 1),
          1
        );
        const hasHighPriority = interactions.some((i: any) => Boolean(i.isHighPriority));

        return {
          leadId: lead.id,
          phoneNumber: lead.phoneNumber,
          name: lead.name || "Tanpa Nama",
          status: lead.status,
          source: lead.source,
          priorityRanking: hasHighPriority ? "URGENT_1" : `LEVEL_${maxUrgency}`,
          maxUrgencyScore: maxUrgency,
          isHighPriority: hasHighPriority,
          needsFollowUp: interactions.some((i: any) => Boolean(i.needsFollowUp)),
          hasBooking: lead.hasBooking,
          contextNotes: lead.contextNotes || "",
          latestMessage: topInteraction?.messageText || "",
          aiSummary: topInteraction?.summary || "",
          recommendedReply: topInteraction?.recommendedReply || "",
          latestIntent: topInteraction?.intentCategory || "",
          sentiment: topInteraction?.sentiment || "",
          totalInteractions: interactions.length,
          allInteractionsRaw: interactions,
          lastUpdatedAt: lead.updatedAt ? new Date(lead.updatedAt).toISOString() : new Date().toISOString(),
        };
      })
      .sort((a, b) => {
        // Urutkan: High Priority dulu, lalu skor urgensi 5 -> 1
        if (a.isHighPriority && !b.isHighPriority) return -1;
        if (!a.isHighPriority && b.isHighPriority) return 1;
        return b.maxUrgencyScore - a.maxUrgencyScore;
      });

    // Jika format CSV diminta untuk Excel / Spreadsheet
    if (format === "csv") {
      const headers = [
        "Prioritas",
        "Skor Urgensi",
        "Nama Klien",
        "No WhatsApp",
        "Status",
        "Kategori Niat (AI)",
        "Sentimen",
        "Pesan Terakhir",
        "Ringkasan AI",
        "Draf Balasan AI",
        "Butuh Follow Up",
        "Update Terakhir",
      ];

      const csvRows = prioritizedList.map((row) => [
        `"${row.priorityRanking}"`,
        `"${row.maxUrgencyScore}/5"`,
        `"${(row.name || "").replace(/"/g, '""')}"`,
        `"${row.phoneNumber}"`,
        `"${row.status}"`,
        `"${row.latestIntent}"`,
        `"${row.sentiment}"`,
        `"${row.latestMessage.replace(/"/g, '""').replace(/\n/g, " ")}"`,
        `"${row.aiSummary.replace(/"/g, '""').replace(/\n/g, " ")}"`,
        `"${row.recommendedReply.replace(/"/g, '""').replace(/\n/g, " ")}"`,
        `"${row.needsFollowUp ? "YA" : "TIDAK"}"`,
        `"${row.lastUpdatedAt}"`,
      ]);

      const csvString = [headers.join(","), ...csvRows.map((r) => r.join(","))].join(
        "\n"
      );

      return new NextResponse(csvString, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="raw_leads_prioritized.csv"',
        },
      });
    }

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
    const errMsg =
      error instanceof Error ? error.message : "Error fetching raw data";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

