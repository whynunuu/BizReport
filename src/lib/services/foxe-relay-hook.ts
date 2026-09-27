import { createHash, timingSafeEqual } from "node:crypto";

type RelayState = "disabled" | "ignored" | "queued" | "duplicate" | "conflict" | "invalid";
export interface RelayHookDependencies {
  enqueue: (rawBody: unknown) => Promise<{ state: RelayState }>;
  schedule: (callback: () => Promise<void>) => void;
  dispatch: () => Promise<unknown>;
  warn?: (code: string) => void;
}

// Queue durably before CRM effects. A downstream outage can never replay OCR,
// Sheets sync or admin alerts by turning an already processed response into 5xx.
export async function withFoxeRelay(
  rawBody: unknown,
  processCRM: () => Promise<Response>,
  deps: RelayHookDependencies,
): Promise<Response> {
  let result: { state: RelayState };
  try {
    result = await deps.enqueue(rawBody);
  } catch {
    deps.warn?.("relay-storage-unavailable");
    return Response.json({ error: "Penerimaan data sementara belum tersedia. Coba ulang." }, { status: 503 });
  }

  if (result.state === "queued" || result.state === "duplicate") {
    try {
      deps.schedule(async () => {
        try { await deps.dispatch(); }
        catch { deps.warn?.("relay-dispatch-unavailable"); }
      });
    } catch {
      // The durable queue remains available to the independent retry worker.
      deps.warn?.("relay-scheduler-unavailable");
    }
  } else if (result.state === "invalid" || result.state === "conflict") {
    deps.warn?.("relay-" + result.state);
  }
  return processCRM();
}

export function authorizeFoxeRelay(request: Request, secret: string | undefined): boolean {
  if (!secret || secret.length < 32) return false;
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Bearer ") || header.length > 256) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header.slice(7)), digest(secret));
}
