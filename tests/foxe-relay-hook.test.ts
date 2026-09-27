import assert from "node:assert/strict";
import test from "node:test";
import { authorizeFoxeRelay, withFoxeRelay } from "../src/lib/services/foxe-relay-hook";

const incoming = {
  device: "test-device",
  sender: "6281234000011",
  inboxid: "test-inbox-1",
  timestamp: 1790514000,
  message: "Private test message that must never appear in warnings",
};

test("storage failure returns 503 before any CRM side effect or network dispatch", async () => {
  let crmCalls = 0;
  let scheduleCalls = 0;
  let dispatchCalls = 0;
  const warnings: string[] = [];
  const response = await withFoxeRelay(incoming, async () => {
    crmCalls++;
    return Response.json({ status: "success" });
  }, {
    enqueue: async () => { throw new Error("simulated private database details"); },
    schedule: () => { scheduleCalls++; },
    dispatch: async () => { dispatchCalls++; },
    warn: (code) => warnings.push(code),
  });

  assert.equal(response.status, 503);
  assert.equal(crmCalls, 0);
  assert.equal(scheduleCalls, 0);
  assert.equal(dispatchCalls, 0);
  assert.ok(warnings.every((code) => !code.includes("private")));
  assert.ok(!(await response.text()).includes("private database"));
});

for (const [label, body] of [
  ["normal CRM", { status: "success", leadId: "test-lead", analysis: { intentCategory: "INFO_UMUM" } }],
  ["receipt CRM", { status: "success", type: "PAYMENT_RECEIPT_VERIFIED", revenue: 150000 }],
] as const) {
  test(`${label} response is unchanged when a durable relay later has a network failure`, async () => {
    const events: string[] = [];
    let deferred: (() => Promise<void>) | undefined;
    const warnings: string[] = [];
    const crmResponse = Response.json(body, { status: 200, headers: { "X-CRM-Test": "preserved" } });

    const response = await withFoxeRelay(incoming, async () => {
      events.push("crm");
      return crmResponse;
    }, {
      enqueue: async (raw) => {
        assert.equal(raw, incoming);
        events.push("durable-enqueue");
        return { state: "queued" };
      },
      schedule: (callback) => { events.push("scheduled"); deferred = callback; },
      dispatch: async () => {
        events.push("network");
        throw new Error("secret destination and private payload");
      },
      warn: (code) => warnings.push(code),
    });

    assert.equal(response, crmResponse);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("X-CRM-Test"), "preserved");
    assert.deepEqual(await response.clone().json(), body);
    assert.deepEqual(events, ["durable-enqueue", "scheduled", "crm"]);
    assert.ok(deferred);
    await assert.doesNotReject(deferred);
    assert.deepEqual(events, ["durable-enqueue", "scheduled", "crm", "network"]);
    assert.ok(warnings.length > 0);
    assert.ok(warnings.every((code) => !code.includes("secret") && !code.includes("private")));
  });
}

test("scheduler failure keeps the durable item and preserves CRM success", async () => {
  let enqueued = false;
  let dispatched = false;
  const warnings: string[] = [];
  const crmResponse = Response.json({ status: "success" });
  const response = await withFoxeRelay(incoming, async () => {
    assert.equal(enqueued, true);
    return crmResponse;
  }, {
    enqueue: async () => { enqueued = true; return { state: "queued" }; },
    schedule: () => { throw new Error("platform scheduling unavailable"); },
    dispatch: async () => { dispatched = true; },
    warn: (code) => warnings.push(code),
  });
  assert.equal(response, crmResponse);
  assert.equal(dispatched, false);
  assert.ok(warnings.length > 0);
});

for (const state of ["disabled", "ignored", "invalid", "conflict"] as const) {
  test(`${state} relay state preserves the CRM response without scheduling network work`, async () => {
    let crmCalls = 0;
    let schedules = 0;
    let dispatches = 0;
    const warnings: string[] = [];
    const crmResponse = Response.json({ error: "Legacy CRM validation" }, { status: 400 });
    const response = await withFoxeRelay(incoming, async () => {
      crmCalls++;
      return crmResponse;
    }, {
      enqueue: async () => ({ state }),
      schedule: () => { schedules++; },
      dispatch: async () => { dispatches++; },
      warn: (code) => warnings.push(code),
    });
    assert.equal(response, crmResponse);
    assert.equal(crmCalls, 1);
    assert.equal(schedules, 0);
    assert.equal(dispatches, 0);
    assert.equal(warnings.length > 0, state === "invalid" || state === "conflict");
  });
}

test("duplicate relay registration still allows unchanged legacy CRM processing", async () => {
  let schedules = 0;
  const crmResponse = Response.json({ status: "success", interactionId: "legacy-interaction" });
  const response = await withFoxeRelay(incoming, async () => crmResponse, {
    enqueue: async () => ({ state: "duplicate" }),
    schedule: () => { schedules++; },
    dispatch: async () => undefined,
  });
  assert.equal(response, crmResponse);
  assert.equal(schedules, 1);
});

test("CRM exceptions remain CRM exceptions after durable enqueue", async () => {
  const crmError = new Error("mock CRM failed");
  let deferred: (() => Promise<void>) | undefined;
  await assert.rejects(withFoxeRelay(incoming, async () => { throw crmError; }, {
    enqueue: async () => ({ state: "queued" }),
    schedule: (callback) => { deferred = callback; },
    dispatch: async () => undefined,
  }), (error: unknown) => error === crmError);
  assert.ok(deferred);
  await deferred();
});

test("retry and status authorization requires the exact configured bearer secret", () => {
  const secret = "test-only-secret-".repeat(3);
  const request = (authorization?: string) => new Request("http://localhost/api/foxe-relay/retry", {
    headers: authorization ? { Authorization: authorization } : {},
  });
  assert.equal(authorizeFoxeRelay(request(`Bearer ${secret}`), secret), true);
  for (const authorization of [undefined, "Bearer wrong", `Basic ${secret}`, `Bearer ${secret}extra`, "Bearer " + "x".repeat(300)]) {
    assert.equal(authorizeFoxeRelay(request(authorization), secret), false);
  }
  assert.equal(authorizeFoxeRelay(request(`Bearer ${secret}`), undefined), false);
  assert.equal(authorizeFoxeRelay(request("Bearer short"), "short"), false);
});
