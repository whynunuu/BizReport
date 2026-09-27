-- Additive only: existing CRM tables and customer records are untouched.
CREATE TABLE IF NOT EXISTS "FoxeRelayOutbox" (
  "id" TEXT NOT NULL,
  "digest" TEXT NOT NULL,
  "payload" JSONB,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseUntil" TIMESTAMP(3),
  "leaseToken" TEXT,
  "deliveredAt" TIMESTAMP(3),
  "lastStatus" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FoxeRelayOutbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FoxeRelayOutbox_status_check" CHECK ("status" IN ('PENDING', 'DELIVERED', 'REVIEW')),
  CONSTRAINT "FoxeRelayOutbox_attempts_check" CHECK ("attempts" >= 0)
);

CREATE INDEX IF NOT EXISTS "FoxeRelayOutbox_status_nextAttemptAt_idx"
  ON "FoxeRelayOutbox"("status", "nextAttemptAt");
CREATE INDEX IF NOT EXISTS "FoxeRelayOutbox_status_leaseUntil_idx"
  ON "FoxeRelayOutbox"("status", "leaseUntil");
