import React from "react";
import { prisma } from "@/lib/prisma";
import {
  RefreshCw,
  FileCode,
  FolderGit2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import AutoRefresher from "@/components/crm/AutoRefresher";
import CRMChatRoom, { Lead } from "@/components/crm/CRMChatRoom";

export const dynamic = "force-dynamic";

export default async function CRMPage() {
  const leads = await prisma.lead.findMany({
    include: {
      interactions: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Sort: high priority first, then by urgency score
  const sortedLeads = [...leads].sort((a, b) => {
    const aUrgent = a.interactions.some((i) => i.isHighPriority) || a.temperature === "HOT";
    const bUrgent = b.interactions.some((i) => i.isHighPriority) || b.temperature === "HOT";
    if (aUrgent && !bUrgent) return -1;
    if (!aUrgent && bUrgent) return 1;
    const aScore = Math.max(...a.interactions.map((i) => i.urgencyScore), 0);
    const bScore = Math.max(...b.interactions.map((i) => i.urgencyScore), 0);
    return bScore - aScore;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      <AutoRefresher interval={10000} />

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI Lead Triage &amp; Chat Room Active</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            WhatsApp AI CRM &amp; Room Chat Pelanggan
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Klik kartu metrik di bawah untuk memfilter leads · Percakapan terpusat per kontak · Draf balasan ramah &amp; human
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/raw-files"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all border border-amber-200/60 shadow-2xs"
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Raw Files Hub</span>
          </Link>
          <a
            href="/api/crm/raw"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all border border-indigo-200/60 shadow-2xs"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Raw JSON</span>
          </a>
          <Link
            href="/crm"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Link>
        </div>
      </div>

      {/* ── INTERACTIVE CHAT ROOM WITH CLICKABLE METRICS ── */}
      <CRMChatRoom leads={sortedLeads as unknown as Lead[]} />
    </div>
  );
}
