import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { Agent, request as httpsRequest, type RequestOptions } from "node:https";
import type { ClientRequest, IncomingMessage } from "node:http";
import test from "node:test";
import { checkServerIdentity } from "node:tls";
import {
  createFoxeRelay,
  readRelayConfig,
  type RelayCounts,
  type RelayInsert,
  type RelayOutcome,
  type RelayRow,
  type RelayStore,
  type RelayTransport,
} from "../src/lib/services/foxe-relay";
import {
  createHttpsRelayTransport,
  FOXE_RELAY_REQUEST_MS,
  FOXE_RELAY_RESPONSE_BYTES,
} from "../src/lib/services/foxe-relay-prisma";

const startTime = new Date("2026-09-27T12:00:00.000Z");
const configEnv = {
  FOXE_LOGIC_WEBHOOK_URL: `https://foxe-fonnte-backend.studiofoxe.workers.dev/webhooks/fonnte/${"a".repeat(43)}`,
  FOXE_LOGIC_DEVICE_ID: "6281234009999",
  FOXE_LOGIC_RELAY_SECRET: "b".repeat(43),
};
const incoming = {
  device: configEnv.FOXE_LOGIC_DEVICE_ID,
  sender: "6281234000011",
  inboxid: "isolated-inbox-1",
  timestamp: 1790510400,
  message: "Sensitive message for isolated testing only",
  name: "Private test customer",
  url: "https://private.invalid/image.jpg",
  base64: "private-image-data",
  amount: 150000,
  isSuccess: true,
};

// This store models uniqueness and compare-and-swap leases; it never opens Prisma.
class MemoryStore implements RelayStore {
  rows = new Map<string, RelayRow>();
  inserts = 0;

  async insert(input: RelayInsert): Promise<"queued" | "duplicate" | "conflict"> {
    this.inserts++;
    const existing = this.rows.get(input.id);
    if (existing) return existing.digest === input.digest ? "duplicate" : "conflict";
    this.rows.set(input.id, {
      ...structuredClone(input),
      status: "PENDING",
      attempts: 0,
      leaseUntil: null,
      leaseToken: null,
      deliveredAt: null,
      lastStatus: null,
    });
    return "queued";
  }

  async candidates(now: Date, limit: number): Promise<RelayRow[]> {
    return [...this.rows.values()]
      .filter((row) => row.status === "PENDING" && row.nextAttemptAt <= now && (!row.leaseUntil || row.leaseUntil <= now))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(0, limit)
      .map((row) => structuredClone(row));
  }

  async claim(id: string, token: string, now: Date, until: Date): Promise<RelayRow | null> {
    const row = this.rows.get(id);
    if (!row || row.status !== "PENDING" || row.nextAttemptAt > now || (row.leaseUntil && row.leaseUntil > now)) return null;
    row.attempts++;
    row.leaseUntil = until;
    row.leaseToken = token;
    return structuredClone(row);
  }

  async finish(id: string, token: string, outcome: RelayOutcome): Promise<boolean> {
    const row = this.rows.get(id);
    if (!row || row.leaseToken !== token) return false;
    row.status = outcome.status;
    row.nextAttemptAt = outcome.nextAttemptAt;
    row.deliveredAt = outcome.deliveredAt;
    row.lastStatus = outcome.lastStatus;
    row.leaseUntil = null;
    row.leaseToken = null;
    if (outcome.clearPayload) row.payload = null;
    return true;
  }

  async counts(now: Date): Promise<RelayCounts> {
    const rows = [...this.rows.values()];
    return {
      pending: rows.filter((row) => row.status === "PENDING").length,
      delivered: rows.filter((row) => row.status === "DELIVERED").length,
      review: rows.filter((row) => row.status === "REVIEW").length,
      due: rows.filter((row) => row.status === "PENDING" && row.nextAttemptAt <= now && (!row.leaseUntil || row.leaseUntil <= now)).length,
      leased: rows.filter((row) => row.status === "PENDING" && row.leaseUntil && row.leaseUntil > now).length,
    };
  }
}

function setup(transport: RelayTransport = async () => ({ status: 200, body: { ok: true } })) {
  const store = new MemoryStore();
  let currentTime = new Date(startTime);
  let storeReads = 0;
  let counter = 0;
  const relay = createFoxeRelay({
    env: () => ({ ...configEnv }),
    store: () => { storeReads++; return store; },
    transport,
    now: () => new Date(currentTime),
    uuid: () => `test-lease-${++counter}`,
    random: () => 0.5,
  });
  return {
    store,
    relay,
    storeReads: () => storeReads,
    setTime: (value: Date) => { currentTime = new Date(value); },
  };
}

function onlyRow(store: MemoryStore): RelayRow {
  assert.equal(store.rows.size, 1);
  return [...store.rows.values()][0];
}

test("missing configuration does not initialize the database or contact any service", async () => {
  let storageCalls = 0;
  let networkCalls = 0;
  const relay = createFoxeRelay({
    env: () => ({}),
    store: () => { storageCalls++; throw new Error("database must not initialize"); },
    transport: async () => { networkCalls++; throw new Error("network must not run"); },
  });
  assert.equal(readRelayConfig({}), null);
  assert.deepEqual(await relay.enqueue(incoming), { state: "disabled" });
  await relay.dispatch();
  await relay.status();
  assert.equal(storageCalls, 0);
  assert.equal(networkCalls, 0);
});

test("configured destination is restricted to the exact HTTPS webhook path", () => {
  assert.ok(readRelayConfig(configEnv));
  for (const badUrl of [
    configEnv.FOXE_LOGIC_WEBHOOK_URL.replace("https:", "http:"),
    configEnv.FOXE_LOGIC_WEBHOOK_URL.replace("studiofoxe.workers.dev", "attacker.invalid"),
    configEnv.FOXE_LOGIC_WEBHOOK_URL.replace("/webhooks/fonnte/", "/integration/status/"),
    `${configEnv.FOXE_LOGIC_WEBHOOK_URL}?forward=private`,
    `${configEnv.FOXE_LOGIC_WEBHOOK_URL}#private`,
    configEnv.FOXE_LOGIC_WEBHOOK_URL.replace("https://", "https://user:password@"),
    configEnv.FOXE_LOGIC_WEBHOOK_URL.replace(".dev/", ".dev:444/"),
  ]) {
    assert.throws(() => readRelayConfig({ ...configEnv, FOXE_LOGIC_WEBHOOK_URL: badUrl }));
  }
  assert.throws(() => readRelayConfig({ ...configEnv, FOXE_LOGIC_RELAY_SECRET: "short" }));
});

test("enqueue preserves original Fonnte metadata but stores no private chat, names, media or payments", async () => {
  let networkCalls = 0;
  const { relay, store } = setup(async () => { networkCalls++; return { status: 200, body: { ok: true } }; });
  const raw = { ...incoming, member: "6287654000011", timestamp: "2026-09-27T19:00:00+07:00" };
  assert.deepEqual(await relay.enqueue(raw), { state: "queued" });
  const row = onlyRow(store);
  assert.deepEqual(row.payload, {
    device: raw.device,
    sender: raw.sender,
    inboxid: raw.inboxid,
    timestamp: raw.timestamp,
    member: raw.member,
  });
  assert.equal(row.status, "PENDING");
  assert.equal(networkCalls, 0);
  const stored = JSON.stringify(row);
  for (const value of [raw.message, raw.name, raw.url, raw.base64]) assert.ok(!stored.includes(value));
  assert.ok(!stored.includes("150000"));
  assert.ok(!row.id.includes(raw.sender));
  assert.ok(!row.id.includes(raw.inboxid));
});

test("foreign devices and non-Fonnte simulator payloads cannot enter the relay queue", async () => {
  const { relay, store } = setup();
  for (const raw of [
    { ...incoming, device: "different-device" },
    { phone: incoming.sender, text: "Simulator payload" },
  ]) {
    const result = await relay.enqueue(raw);
    assert.ok(result.state === "ignored" || result.state === "invalid");
  }
  assert.equal(store.rows.size, 0);
});

test("Fonnte private events retain the provider's empty member field", async () => {
  const { relay, store } = setup();
  assert.equal((await relay.enqueue({ ...incoming, member: "" })).state, "queued");
  assert.equal(onlyRow(store).payload?.member, "");
});

test("missing provider IDs or timestamps are never fabricated", async () => {
  const { relay, store } = setup();
  for (const raw of [
    { ...incoming, inboxid: undefined },
    { ...incoming, timestamp: undefined },
    { ...incoming, timestamp: "not-a-timestamp" },
  ]) {
    assert.equal((await relay.enqueue(raw)).state, "invalid");
  }
  assert.equal(store.rows.size, 0);
});

test("provider retries share one stable queue ID; conflicting replay does not replace the original", async () => {
  const { relay, store } = setup();
  assert.equal((await relay.enqueue(incoming)).state, "queued");
  const first = structuredClone(onlyRow(store));
  assert.equal((await relay.enqueue({ ...incoming })).state, "duplicate");
  assert.equal((await relay.enqueue({ ...incoming, message: "A different private message" })).state, "conflict");
  assert.deepEqual(onlyRow(store), first);
  assert.equal(store.rows.size, 1);
});

test("only acknowledged worker success marks delivery and purges temporary metadata", async () => {
  let sent: unknown;
  const { relay, store } = setup(async (url, payload) => {
    assert.equal(url, configEnv.FOXE_LOGIC_WEBHOOK_URL);
    sent = structuredClone(payload);
    return { status: 200, body: { ok: true, duplicate: true } };
  });
  await relay.enqueue(incoming);
  const summary = await relay.dispatch();
  assert.equal(summary.delivered, 1);
  assert.deepEqual(sent, {
    device: incoming.device,
    sender: incoming.sender,
    inboxid: incoming.inboxid,
    timestamp: incoming.timestamp,
  });
  const row = onlyRow(store);
  assert.equal(row.status, "DELIVERED");
  assert.equal(row.payload, null);
  assert.equal(row.lastStatus, 200);
  assert.ok(row.deliveredAt);
  assert.equal(row.leaseToken, null);
  assert.equal(row.leaseUntil, null);
});

test("HTTP 200 without the worker acknowledgement never loses queue metadata", async () => {
  const { relay, store } = setup(async () => ({ status: 200, body: "<html>login required</html>" }));
  await relay.enqueue(incoming);
  await relay.dispatch();
  const row = onlyRow(store);
  assert.notEqual(row.status, "DELIVERED");
  assert.ok(row.payload);
  assert.equal(row.deliveredAt, null);
});

for (const code of [503, 429]) {
  test(`worker ${code} keeps the durable event for a delayed retry`, async () => {
    const { relay, store, setTime } = setup(async () => ({ status: code, body: { ok: false } }));
    await relay.enqueue(incoming);
    const first = await relay.dispatch();
    const row = onlyRow(store);
    assert.equal(first.retry, 1);
    assert.equal(row.status, "PENDING");
    assert.ok(row.payload);
    assert.equal(row.attempts, 1);
    assert.ok(row.nextAttemptAt > startTime);
    assert.equal(row.leaseToken, null);
    assert.equal((await relay.dispatch()).claimed, 0);
    setTime(row.nextAttemptAt);
    assert.equal((await relay.dispatch()).claimed, 1);
    assert.equal(row.attempts, 2);
  });
}

test("timeout errors keep metadata for retry and never store private exception text", async () => {
  const { relay, store } = setup(async () => { throw new Error("Timed out at secret URL with private data"); });
  await relay.enqueue(incoming);
  assert.equal((await relay.dispatch()).retry, 1);
  const row = onlyRow(store);
  assert.equal(row.status, "PENDING");
  assert.ok(row.payload);
  assert.ok(!JSON.stringify(row).includes("secret URL"));
});

for (const code of [400, 401, 403, 404, 408, 409, 422]) {
  test(`worker ${code} requires review instead of an unlimited retry loop`, async () => {
    const { relay, store } = setup(async () => ({ status: code, body: { error: "Private upstream details" } }));
    await relay.enqueue(incoming);
    const outcome = await relay.dispatch();
    assert.equal(outcome.review, 1);
    const row = onlyRow(store);
    assert.equal(row.status, "REVIEW");
    assert.ok(row.payload);
    assert.equal(row.lastStatus, code);
    assert.equal((await relay.dispatch()).claimed, 0);
    assert.ok(!JSON.stringify(row).includes("Private upstream details"));
  });
}

test("concurrent drains acquire one lease and make one delivery attempt", async () => {
  let release!: () => void;
  let started!: () => void;
  const startedPromise = new Promise<void>((resolve) => { started = resolve; });
  const releasePromise = new Promise<void>((resolve) => { release = resolve; });
  let networkCalls = 0;
  const { relay, store } = setup(async () => {
    networkCalls++;
    started();
    await releasePromise;
    return { status: 200, body: { ok: true } };
  });
  await relay.enqueue(incoming);
  const first = relay.dispatch();
  await startedPromise;
  const second = await relay.dispatch();
  assert.equal(second.claimed, 0);
  release();
  assert.equal((await first).delivered, 1);
  assert.equal(networkCalls, 1);
  assert.equal(onlyRow(store).attempts, 1);
});

test("an expired old lease cannot overwrite a later successful delivery", async () => {
  let releaseFirst!: () => void;
  let firstStarted!: () => void;
  const firstStartedPromise = new Promise<void>((resolve) => { firstStarted = resolve; });
  const releasePromise = new Promise<void>((resolve) => { releaseFirst = resolve; });
  let calls = 0;
  const { relay, store, setTime } = setup(async () => {
    calls++;
    if (calls === 1) {
      firstStarted();
      await releasePromise;
      return { status: 503, body: { ok: false } };
    }
    return { status: 200, body: { ok: true } };
  });
  await relay.enqueue(incoming);
  const oldDrain = relay.dispatch();
  await firstStartedPromise;
  const lease = onlyRow(store).leaseUntil;
  assert.ok(lease);
  setTime(new Date(lease.getTime() + 1));
  assert.equal((await relay.dispatch()).delivered, 1);
  releaseFirst();
  await oldDrain;
  const row = onlyRow(store);
  assert.equal(row.status, "DELIVERED");
  assert.equal(row.payload, null);
  assert.equal(row.lastStatus, 200);
  assert.equal(row.attempts, 2);
});

test("retry delays grow to a bounded cap while preserving the durable event", async () => {
  const { relay, store, setTime } = setup(async () => ({ status: 503, body: { ok: false } }));
  await relay.enqueue(incoming);
  let previousDelay = 0;
  let currentTime = new Date(startTime);
  for (let attempt = 0; attempt < 30; attempt++) {
    await relay.dispatch();
    const row = onlyRow(store);
    assert.equal(row.status, "PENDING");
    const delay = row.nextAttemptAt.getTime() - currentTime.getTime();
    assert.ok(delay > 0);
    assert.ok(delay >= previousDelay);
    assert.ok(delay <= 60 * 60 * 1000, "retry delay must not exceed one hour");
    previousDelay = delay;
    currentTime = new Date(row.nextAttemptAt);
    setTime(currentTime);
  }
  assert.equal(previousDelay, 60 * 60 * 1000);
  assert.equal(onlyRow(store).status, "PENDING");
  assert.ok(onlyRow(store).payload);
});

test("dispatch batches are capped even when the caller requests an excessive limit", async () => {
  const { relay, store } = setup();
  for (let i = 0; i < 100; i++) await relay.enqueue({ ...incoming, inboxid: `isolated-batch-${i}` });
  const summary = await relay.dispatch(1000000);
  assert.ok(summary.claimed > 0 && summary.claimed < 100);
  assert.equal([...store.rows.values()].filter((row) => row.status === "DELIVERED").length, summary.delivered);
});

function mockHttps(status = 200, chunks: (Buffer | string)[] = ['{"ok":true}'], respond = true) {
  const requests: { url: URL; options: RequestOptions; bytes?: Buffer }[] = [];
  const response = new EventEmitter() as EventEmitter & { statusCode: number; destroy: () => void };
  response.statusCode = status;
  response.destroy = () => undefined;
  let requestDestroyed = false;
  const requestImpl = ((url: URL, options: RequestOptions, callback: (res: IncomingMessage) => void) => {
    const captured = { url, options, bytes: undefined as Buffer | undefined };
    requests.push(captured);
    const req = new EventEmitter() as EventEmitter & { end: (body: Buffer) => void; destroy: () => void };
    req.destroy = () => { requestDestroyed = true; };
    req.end = (bytes) => {
      captured.bytes = Buffer.from(bytes);
      if (!respond) return;
      queueMicrotask(() => {
        callback(response as unknown as IncomingMessage);
        for (const chunk of chunks) response.emit("data", chunk);
        response.emit("end");
      });
    };
    return req as unknown as ClientRequest;
  }) as unknown as typeof httpsRequest;
  return { requestImpl, requests, destroyed: () => requestDestroyed };
}

test("native transport enforces TLS verification even if the legacy CRM disables global verification", async () => {
  const before = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    const mock = mockHttps();
    const transport = createHttpsRelayTransport(mock.requestImpl);
    const payload = { device: incoming.device, sender: incoming.sender, inboxid: incoming.inboxid, timestamp: incoming.timestamp };
    assert.deepEqual(await transport(configEnv.FOXE_LOGIC_WEBHOOK_URL, payload), { status: 200, body: { ok: true } });
    assert.equal(mock.requests.length, 1);
    const { options, bytes } = mock.requests[0];
    assert.ok(options && typeof options === "object");
    const tlsOptions = options as { agent: Agent; rejectUnauthorized: boolean; checkServerIdentity: unknown; method: string; headers: Record<string, unknown> };
    assert.equal(tlsOptions.rejectUnauthorized, true);
    assert.equal(tlsOptions.checkServerIdentity, checkServerIdentity);
    assert.ok(tlsOptions.agent instanceof Agent);
    assert.equal(tlsOptions.agent.options.rejectUnauthorized, true);
    assert.equal(tlsOptions.agent.options.checkServerIdentity, checkServerIdentity);
    assert.equal(tlsOptions.method, "POST");
    assert.ok(bytes);
    assert.deepEqual(JSON.parse(bytes.toString()), payload);
    assert.equal(tlsOptions.headers["Content-Length"], bytes.byteLength);
  } finally {
    if (before === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = before;
  }
});

test("redirect responses never make a second request or forward the credential URL", async () => {
  const mock = mockHttps(302, []);
  const result = await createHttpsRelayTransport(mock.requestImpl)(configEnv.FOXE_LOGIC_WEBHOOK_URL, {
    device: incoming.device, sender: incoming.sender, inboxid: incoming.inboxid, timestamp: incoming.timestamp,
  });
  assert.equal(result.status, 302);
  assert.equal(mock.requests.length, 1);
});

test("native transport strips private fields even when another caller bypasses the core whitelist", async () => {
  const mock = mockHttps();
  const payload = {
    device: incoming.device, sender: incoming.sender, inboxid: incoming.inboxid, timestamp: incoming.timestamp,
    message: incoming.message, name: incoming.name, url: incoming.url, base64: incoming.base64, amount: incoming.amount,
  };
  await createHttpsRelayTransport(mock.requestImpl)(configEnv.FOXE_LOGIC_WEBHOOK_URL, payload);
  const bytes = mock.requests[0].bytes;
  assert.ok(bytes);
  assert.deepEqual(JSON.parse(bytes.toString()), {
    device: incoming.device, sender: incoming.sender, inboxid: incoming.inboxid, timestamp: incoming.timestamp,
  });
});

test("native transport refuses an untrusted destination before constructing a request", async () => {
  const mock = mockHttps();
  const transport = createHttpsRelayTransport(mock.requestImpl);
  await assert.rejects(transport("https://attacker.invalid/webhooks/fonnte/hidden", {
    device: incoming.device, sender: incoming.sender, inboxid: incoming.inboxid, timestamp: incoming.timestamp,
  }), /FOXE_RELAY_DESTINATION_INVALID/);
  assert.equal(mock.requests.length, 0);
});

test("oversized worker responses cannot become a valid acknowledgement", async () => {
  const mock = mockHttps(200, [Buffer.alloc(FOXE_RELAY_RESPONSE_BYTES + 1), '{"ok":true}']);
  const result = await createHttpsRelayTransport(mock.requestImpl)(configEnv.FOXE_LOGIC_WEBHOOK_URL, {
    device: incoming.device, sender: incoming.sender, inboxid: incoming.inboxid, timestamp: incoming.timestamp,
  });
  assert.deepEqual(result, { status: 200, body: null });
});

test("an absolute transport deadline aborts a stalled request with a safe error", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const mock = mockHttps(200, [], false);
  const transport = createHttpsRelayTransport(mock.requestImpl);
  const rejection = assert.rejects(transport(configEnv.FOXE_LOGIC_WEBHOOK_URL, {
    device: incoming.device, sender: incoming.sender, inboxid: incoming.inboxid, timestamp: incoming.timestamp,
  }), /FOXE_RELAY_NETWORK_UNAVAILABLE/);
  t.mock.timers.tick(FOXE_RELAY_REQUEST_MS);
  await rejection;
  assert.equal(mock.destroyed(), true);
});
