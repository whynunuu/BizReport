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
import CRMChatRoom from "@/components/crm/CRMChatRoom";
import { Lead, sortLeadsForAdminAction } from "@/lib/crm-sorting";
import GoogleSheetsSyncButton from "@/components/crm/GoogleSheetsSyncButton";

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

  // Sort: Tier 1 HOT on top, Tier 2 WARM/COLD in middle, Tier 3 Completed DP at bottom
  const sortedLeads = sortLeadsForAdminAction(leads as unknown as Lead[]);

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      <AutoRefresher interval={10000} />

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold mb-2 border border-zinc-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI Lead Triage &amp; Chat Room Active</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            WhatsApp AI CRM &amp; Room Chat Pelanggan
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Klik kartu metrik di bawah untuk memfilter leads · Urutan prioritas: HOT Action di atas, DP Selesai di bawah
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <GoogleSheetsSyncButton />
          <Link
            href="/raw-files"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all border border-zinc-700 shadow-2xs"
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Raw Files Hub</span>
          </Link>
          <a
            href="/api/crm/raw"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all border border-zinc-700 shadow-2xs"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Raw JSON</span>
          </a>
          <Link
            href="/crm"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all border border-zinc-700"
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
