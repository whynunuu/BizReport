import { createHash, randomUUID } from "node:crypto";

export const FOXE_RELAY_ORIGIN = "https://foxe-fonnte-backend.studiofoxe.workers.dev";
export const FOXE_RELAY_PATH = "/webhooks/fonnte/";
export const FOXE_RELAY_LEASE_MS = 30_000;
export const FOXE_RELAY_DRAIN_MS = 20_000;

type Scalar = string | number;
export type RelayStatus = "PENDING" | "DELIVERED" | "REVIEW";
export interface RelayPayload {
  device: Scalar;
  sender: Scalar;
  inboxid: Scalar;
  timestamp: Scalar;
  member?: Scalar;
}
export interface RelayConfig { url: string; deviceId: string; cronSecret: string }
export interface RelayRow {
  id: string;
  digest: string;
  payload: RelayPayload | null;
  status: RelayStatus;
  attempts: number;
  nextAttemptAt: Date;
  leaseUntil: Date | null;
  leaseToken: string | null;
  deliveredAt: Date | null;
  lastStatus: number | null;
  createdAt: Date;
}
export interface RelayInsert {
  id: string;
  digest: string;
  payload: RelayPayload;
  createdAt: Date;
  nextAttemptAt: Date;
}
export interface RelayOutcome {
  status: RelayStatus;
  nextAttemptAt: Date;
  deliveredAt: Date | null;
  lastStatus: number | null;
  clearPayload: boolean;
}
export interface RelayCounts { pending: number; delivered: number; review: number; due: number; leased: number }
export interface RelayStore {
  insert(input: RelayInsert): Promise<"queued" | "duplicate" | "conflict">;
  candidates(now: Date, limit: number): Promise<RelayRow[]>;
  claim(id: string, token: string, now: Date, until: Date): Promise<RelayRow | null>;
  finish(id: string, token: string, outcome: RelayOutcome): Promise<boolean>;
  counts(now: Date): Promise<RelayCounts>;
}
export type RelayTransport = (url: string, payload: RelayPayload) => Promise<{ status: number; body: unknown }>;
export type RelayEnqueueState = "disabled" | "ignored" | "queued" | "duplicate" | "conflict" | "invalid";
export interface RelayDispatchResult { claimed: number; delivered: number; retry: number; review: number }

export function isAllowedRelayURL(value: string): boolean {
  try {
    const url = new URL(value);
    return url.origin === FOXE_RELAY_ORIGIN && !url.username && !url.password &&
      !url.search && !url.hash && new RegExp("^" + FOXE_RELAY_PATH + "[A-Za-z0-9_-]{32,512}$").test(url.pathname);
  } catch { return false; }
}

export function readRelayConfig(env: Record<string, string | undefined>): RelayConfig | null {
  const url = env.FOXE_LOGIC_WEBHOOK_URL;
  const deviceId = env.FOXE_LOGIC_DEVICE_ID;
  const cronSecret = env.FOXE_LOGIC_RELAY_SECRET;
  if (!url || !deviceId || !cronSecret) return null;
  if (!isAllowedRelayURL(url) || deviceId.length > 256 || deviceId.trim() !== deviceId || cronSecret.length < 32) {
    // Never include the destination path or credential in an error.
    throw new Error("FOXE_RELAY_CONFIGURATION_INVALID");
  }
  return { url, deviceId, cronSecret };
}

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
function isScalar(value: unknown, max = 256, allowEmpty = false): value is Scalar {
  return (typeof value === "string" && (allowEmpty || value.length > 0) && value.length <= max) ||
    (typeof value === "number" && Number.isSafeInteger(value));
}
function timestampDate(value: Scalar, now: Date): Date | null {
  const text = String(value);
  const numeric = /^\d{10}(?:\d{3})?$/.test(text) ? Number(text) : NaN;
  if (!Number.isFinite(numeric) && !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(text)) return null;
  const parsed = Number.isFinite(numeric) ? new Date(numeric < 1e12 ? numeric * 1000 : numeric) : new Date(text);
  return Number.isFinite(parsed.getTime()) && parsed.getTime() >= Date.UTC(2000, 0, 1) &&
    parsed.getTime() <= now.getTime() + 60_000 ? parsed : null;
}

/** The original chat is hashed transiently, but never returned or stored. */
export function prepareRelayEvent(raw: unknown, deviceId: string, now: Date):
  { state: "ignored" | "invalid" } | { state: "ready"; input: RelayInsert } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { state: "ignored" };
  const source = raw as Record<string, unknown>;
  if (!isScalar(source.device) || String(source.device) !== deviceId) return { state: "ignored" };
  if (!isScalar(source.sender) || !isScalar(source.inboxid) || !isScalar(source.timestamp) ||
      (source.member !== undefined && !isScalar(source.member, 256, true)) ||
      (source.message !== undefined && (typeof source.message !== "string" || source.message.length > 50_000))) {
    return { state: "invalid" };
  }
  const occurred = timestampDate(source.timestamp, now);
  if (!occurred) return { state: "invalid" };
  const payload: RelayPayload = {
    device: source.device, sender: source.sender, inboxid: source.inboxid, timestamp: source.timestamp,
    ...(source.member !== undefined ? { member: source.member as Scalar } : {}),
  };
  return {
    state: "ready",
    input: {
      id: digest(String(source.device) + "\0" + String(source.inboxid)),
      digest: digest(JSON.stringify([String(source.device), String(source.sender),
        source.member === undefined ? "" : String(source.member), occurred.toISOString(), source.message ?? ""])),
      payload, createdAt: now, nextAttemptAt: now,
    },
  };
}

export function relayRetryAt(now: Date, attempts: number, random = Math.random): Date {
  const base = Math.min(3_600_000, 30_000 * 2 ** Math.min(Math.max(attempts - 1, 0), 7));
  const sample = random();
  const jitter = Number.isFinite(sample) ? Math.max(0, Math.min(1, sample)) : 0;
  return new Date(now.getTime() + Math.min(3_600_000, Math.round(base * (1 + jitter * 0.2))));
}

export function createFoxeRelay(deps: {
  env: () => Record<string, string | undefined>;
  store: () => RelayStore;
  transport: RelayTransport;
  now?: () => Date;
  uuid?: () => string;
  random?: () => number;
}) {
  const now = deps.now ?? (() => new Date());
  return {
    async enqueue(raw: unknown): Promise<{ state: RelayEnqueueState }> {
      const config = readRelayConfig(deps.env());
      if (!config) return { state: "disabled" };
      const event = prepareRelayEvent(raw, config.deviceId, now());
      if (event.state !== "ready") return event;
      // A database exception intentionally propagates before CRM side effects.
      return { state: await deps.store().insert(event.input) };
    },
    async dispatch(limit = 5): Promise<RelayDispatchResult> {
      const result: RelayDispatchResult = { claimed: 0, delivered: 0, retry: 0, review: 0 };
      const config = readRelayConfig(deps.env());
      if (!config) return result;
      const count = Number.isFinite(limit) ? Math.min(10, Math.max(1, Math.floor(limit))) : 5;
      const store = deps.store();
      const started = now();
      const candidates = await store.candidates(started, count);
      for (const candidate of candidates) {
        const claimAt = now();
        if (claimAt.getTime() - started.getTime() >= FOXE_RELAY_DRAIN_MS) break;
        const token = (deps.uuid ?? randomUUID)();
        const row = await store.claim(candidate.id, token, claimAt, new Date(claimAt.getTime() + FOXE_RELAY_LEASE_MS));
        if (!row) continue;
        result.claimed++;
        let status: number | null = null;
        let outcome: RelayStatus = "REVIEW";
        const event = row.payload ? prepareRelayEvent(row.payload, config.deviceId, claimAt) : { state: "invalid" as const };
        if (event.state === "ready") {
          try {
            const response = await deps.transport(config.url, event.input.payload);
            status = response.status;
            const ack = response.body && typeof response.body === "object" &&
              !Array.isArray(response.body) && (response.body as { ok?: unknown }).ok === true;
            outcome = status === 200 && ack ? "DELIVERED" :
              status === 429 || status >= 500 ? "PENDING" : "REVIEW";
          } catch { outcome = "PENDING"; }
        }
        const completedAt = now();
        const saved = await store.finish(row.id, token, {
          status: outcome,
          nextAttemptAt: outcome === "PENDING" ? relayRetryAt(completedAt, row.attempts, deps.random) : completedAt,
          deliveredAt: outcome === "DELIVERED" ? completedAt : null,
          lastStatus: status,
          clearPayload: outcome === "DELIVERED",
        });
        if (saved) result[outcome === "DELIVERED" ? "delivered" : outcome === "PENDING" ? "retry" : "review"]++;
      }
      return result;
    },
    async status(): Promise<RelayCounts & { enabled: boolean }> {
      const config = readRelayConfig(deps.env());
      if (!config) return { enabled: false, pending: 0, delivered: 0, review: 0, due: 0, leased: 0 };
      return { enabled: true, ...await deps.store().counts(now()) };
    },
  };
}
