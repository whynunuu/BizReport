import { NextRequest, NextResponse } from "next/server";
import { syncLogOrderDPs } from "@/lib/services/log-order-sync";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const onlyDay = body?.onlyDay ? Number(body.onlyDay) : undefined;

    console.log(`[APISyncLogOrder] Memulai sinkronisasi Log Order DP ${onlyDay ? `khusus tanggal ${onlyDay}` : "seluruh bulan September 2026"}...`);

    const result = await syncLogOrderDPs({ onlyDay });

    if (result.status === "error") {
      return NextResponse.json({ status: "error", error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      status: "success",
      message: `Berhasil mencocokkan ${result.matchedCount} chat WA dan menyinkronkan ${result.createdCount} data DP baru dari Log Order!`,
      data: result,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[APISyncLogOrder] Fatal error:", error);
    return NextResponse.json({ status: "error", error: errMsg }, { status: 500 });
  }
}
