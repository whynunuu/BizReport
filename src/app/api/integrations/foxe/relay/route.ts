import { authorizeFoxeRelay } from "@/lib/services/foxe-relay-hook";
import { dispatchFoxeRelay, getFoxeRelayStatus } from "@/lib/services/foxe-relay-prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const json = (data: unknown, status = 200) => Response.json(data, {
  status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
});

export async function GET(request: Request) {
  if (!authorizeFoxeRelay(request, process.env.FOXE_LOGIC_RELAY_SECRET)) return json({ error: "Unauthorized" }, 401);
  try { return json(await getFoxeRelayStatus()); }
  catch { return json({ error: "Antrean sementara belum tersedia." }, 503); }
}

export async function POST(request: Request) {
  if (!authorizeFoxeRelay(request, process.env.FOXE_LOGIC_RELAY_SECRET)) return json({ error: "Unauthorized" }, 401);
  try { return json(await dispatchFoxeRelay(5)); }
  catch { return json({ error: "Antrean sementara belum tersedia." }, 503); }
}
