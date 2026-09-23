import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { phoneNumbers } = await req.json();

    if (!Array.isArray(phoneNumbers)) {
      return NextResponse.json({ error: "phoneNumbers harus berupa array" }, { status: 400 });
    }

    const results: Record<string, string> = {};

    for (const phone of phoneNumbers) {
      const lead = await prisma.lead.findUnique({ where: { phoneNumber: phone } });
      if (lead) {
        await prisma.leadInteraction.deleteMany({ where: { leadId: lead.id } });
        await prisma.photoDeliveryJob.deleteMany({ where: { leadId: lead.id } });
        await prisma.lead.delete({ where: { id: lead.id } });
        results[phone] = `Dihapus (${lead.name || "no name"})`;
      } else {
        results[phone] = "Tidak ditemukan";
      }
    }

    const remaining = await prisma.lead.count();

    return NextResponse.json({ status: "ok", results, remainingLeads: remaining });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
