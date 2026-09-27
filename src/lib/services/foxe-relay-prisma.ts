import { Agent, request as httpsRequest } from "node:https";
import { checkServerIdentity } from "node:tls";
import {
  createFoxeRelay, isAllowedRelayURL,
  type RelayRow, type RelayStore, type RelayTransport,
} from "./foxe-relay";

export const FOXE_RELAY_REQUEST_MS = 4_000;
export const FOXE_RELAY_RESPONSE_BYTES = 8_192;

/** Dedicated verified TLS: the CRM's global TLS override cannot affect this agent. */
export function createHttpsRelayTransport(requestImpl: typeof httpsRequest = httpsRequest): RelayTransport {
  return async (destination, payload) => {
    if (!isAllowedRelayURL(destination)) throw new Error("FOXE_RELAY_DESTINATION_INVALID");
    return new Promise((resolve, reject) => {
      const wirePayload = {
        device: payload.device, sender: payload.sender, inboxid: payload.inboxid, timestamp: payload.timestamp,
        ...(payload.member !== undefined ? { member: payload.member } : {}),
      };
      const bytes = Buffer.from(JSON.stringify(wirePayload));
      const agent = new Agent({ rejectUnauthorized: true, checkServerIdentity, keepAlive: false });
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const cleanup = () => { if (timer) clearTimeout(timer); agent.destroy(); };
      const fail = () => {
        if (settled) return;
        settled = true; cleanup();
        reject(new Error("FOXE_RELAY_NETWORK_UNAVAILABLE"));
      };
      try {
        const req = requestImpl(new URL(destination), {
          method: "POST", agent, rejectUnauthorized: true, checkServerIdentity,
          headers: { "Content-Type": "application/json", "Content-Length": bytes.byteLength },
        }, response => {
          const status = response.statusCode ?? 0;
          let size = 0;
          const chunks: Buffer[] = [];
          const complete = (body: unknown) => {
            if (settled) return;
            settled = true; cleanup(); resolve({ status, body });
          };
          // node:https does not follow redirects. Never send a credential path elsewhere.
          response.on("data", (chunk: Buffer | string) => {
            const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            size += part.byteLength;
            if (size > FOXE_RELAY_RESPONSE_BYTES) { complete(null); response.destroy(); return; }
            chunks.push(part);
          });
          response.on("end", () => {
            let body: unknown = null;
            try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { /* Invalid ACK becomes REVIEW. */ }
            complete(body);
          });
          response.on("error", fail);
          response.on("aborted", fail);
        });
        req.on("error", fail);
        // Absolute deadline includes DNS, handshake and a trickling response body.
        if (!settled) timer = setTimeout(() => { fail(); req.destroy(); }, FOXE_RELAY_REQUEST_MS);
        req.end(bytes);
      } catch { fail(); }
    });
  };
}

// Import lazily: disabled relay requests do not initialize or query Prisma.
async function database() {
  const [{ prisma }, { Prisma }] = await Promise.all([import("../prisma"), import("@prisma/client")]);
  return { prisma, Prisma };
}
function asRow(row: unknown): RelayRow { return row as RelayRow; }

const store: RelayStore = {
  async insert(input) {
    const { prisma, Prisma } = await database();
    try {
      await prisma.foxeRelayOutbox.create({ data: {
        id: input.id, digest: input.digest,
        payload: input.payload as unknown as import("@prisma/client").Prisma.InputJsonValue,
        createdAt: input.createdAt, nextAttemptAt: input.nextAttemptAt,
      } });
      return "queued";
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
      const prior = await prisma.foxeRelayOutbox.findUnique({ where: { id: input.id }, select: { digest: true } });
      if (!prior) throw new Error("FOXE_RELAY_ENQUEUE_UNAVAILABLE");
      return prior.digest === input.digest ? "duplicate" : "conflict";
    }
  },
  async candidates(now, limit) {
    const { prisma } = await database();
    const rows = await prisma.foxeRelayOutbox.findMany({
      where: { status: "PENDING", nextAttemptAt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] },
      orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }], take: limit,
    });
    return rows.map(asRow);
  },
  async claim(id, token, now, until) {
    const { prisma } = await database();
    const changed = await prisma.foxeRelayOutbox.updateMany({
      where: { id, status: "PENDING", nextAttemptAt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] },
      data: { leaseToken: token, leaseUntil: until, attempts: { increment: 1 } },
    });
    if (changed.count !== 1) return null;
    const row = await prisma.foxeRelayOutbox.findUnique({ where: { id } });
    return row?.leaseToken === token ? asRow(row) : null;
  },
  async finish(id, token, outcome) {
    const { prisma, Prisma } = await database();
    const changed = await prisma.foxeRelayOutbox.updateMany({
      where: { id, status: "PENDING", leaseToken: token },
      data: {
        status: outcome.status, nextAttemptAt: outcome.nextAttemptAt,
        deliveredAt: outcome.deliveredAt, lastStatus: outcome.lastStatus,
        leaseUntil: null, leaseToken: null,
        ...(outcome.clearPayload ? { payload: Prisma.DbNull } : {}),
      },
    });
    return changed.count === 1;
  },
  async counts(now) {
    const { prisma } = await database();
    const [pending, delivered, review, due, leased] = await Promise.all([
      prisma.foxeRelayOutbox.count({ where: { status: "PENDING" } }),
      prisma.foxeRelayOutbox.count({ where: { status: "DELIVERED" } }),
      prisma.foxeRelayOutbox.count({ where: { status: "REVIEW" } }),
      prisma.foxeRelayOutbox.count({ where: { status: "PENDING", nextAttemptAt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] } }),
      prisma.foxeRelayOutbox.count({ where: { status: "PENDING", leaseUntil: { gt: now } } }),
    ]);
    return { pending, delivered, review, due, leased };
  },
};

const relay = createFoxeRelay({ env: () => process.env, store: () => store, transport: createHttpsRelayTransport() });
export const enqueueFoxeRelay = relay.enqueue;
export const dispatchFoxeRelay = relay.dispatch;
export const getFoxeRelayStatus = relay.status;
