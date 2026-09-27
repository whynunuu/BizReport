import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

// Run with `vercel env run -e production -- node --import tsx ... --apply`.
// Credentials stay in the process environment; this never loads a local .env.
async function main() {
  if (!process.argv.includes("--apply")) throw new Error("APPLY_FLAG_REQUIRED");
  if (!process.env.DATABASE_URL?.startsWith("postgres")) throw new Error("POSTGRES_CONFIGURATION_REQUIRED");
  const sql = await readFile(new URL("../prisma/foxe-relay.sql", import.meta.url), "utf8");
  const statements = sql.split(";").map(value => value.replace(/^--.*$/gm, "").trim()).filter(Boolean);
  if (statements.length !== 3 || statements.some(value => !/^CREATE (TABLE|INDEX) IF NOT EXISTS "FoxeRelayOutbox/.test(value))) {
    throw new Error("ADDITIVE_SCHEMA_VALIDATION_FAILED");
  }
  const prisma = new PrismaClient({ log: [] });
  try {
    await prisma.$transaction(statements.map(statement => prisma.$executeRawUnsafe(statement)));
    console.log("FoxeRelayOutbox: additive schema siap.");
  } finally { await prisma.$disconnect(); }
}

main().catch(() => { console.error("Schema antrean belum diterapkan. Periksa akses database/project."); process.exitCode = 1; });
