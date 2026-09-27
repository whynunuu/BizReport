import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const mode = process.argv[2];
const expectedProjectId = 'prj_1qjlpX9kfJqidXYbhOoORJHXKoEk';
const crmTables = ['Lead', 'LeadInteraction', 'DailyReport', 'AdminShift', 'PhotoDeliveryJob'];
const tableNames = [...crmTables, 'FoxeRelayOutbox'];
class CheckFailure extends Error {
  constructor(code) { super(code); this.code = code; }
}
const assert = (condition, code) => { if (!condition) throw new CheckFailure(code); };
const same = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);
function normalize(value, { parentheses = false, textCasts = false, identifierQuotes = false } = {}) {
  const sql = String(value ?? '');
  let output = '', quoted = false, identifier = false;
  for (let position = 0; position < sql.length; position++) {
    const character = sql[position];
    if (identifier) {
      if (character === '"') {
        if (sql[position + 1] === '"') { output += identifierQuotes ? '""' : '"'; position++; }
        else { identifier = false; if (identifierQuotes) output += '"'; }
      } else output += character;
    } else if (character === "'") {
      output += character;
      if (quoted && sql[position + 1] === "'") { output += "'"; position++; }
      else quoted = !quoted;
    } else if (quoted) output += character;
    else if (character === '"') { identifier = true; if (identifierQuotes) output += '"'; }
    else if (textCasts && sql.slice(position, position + 6) === '::text') position += 5;
    else if (!/\s/.test(character) && character !== '"' && !(parentheses && /[()]/.test(character))) output += character;
  }
  return output;
}

// Expected columns come from prisma/schema.prisma and prisma/foxe-relay.sql.
const expectedColumns = {
  id: ['text', false, null],
  digest: ['text', false, null],
  payload: ['jsonb', true, null],
  status: ['text', false, "'PENDING'::text"],
  attempts: ['integer', false, '0'],
  nextAttemptAt: ['timestamp without time zone', false, 'CURRENT_TIMESTAMP'],
  leaseUntil: ['timestamp without time zone', true, null],
  leaseToken: ['text', true, null],
  deliveredAt: ['timestamp without time zone', true, null],
  lastStatus: ['integer', true, null],
  createdAt: ['timestamp without time zone', false, 'CURRENT_TIMESTAMP'],
};

// Pin the complete three statements, not just their prefix or destination names.
const approvedStatements = [
  `CREATE TABLE IF NOT EXISTS "FoxeRelayOutbox" (
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
  )`,
  `CREATE INDEX IF NOT EXISTS "FoxeRelayOutbox_status_nextAttemptAt_idx" ON "FoxeRelayOutbox"("status", "nextAttemptAt")`,
  `CREATE INDEX IF NOT EXISTS "FoxeRelayOutbox_status_leaseUntil_idx" ON "FoxeRelayOutbox"("status", "leaseUntil")`,
];

function validateStatements(sql) {
  const statements = sql.replace(/^\s*--.*$/gm, '').split(';').map(statement => statement.trim()).filter(Boolean);
  assert(statements.length === 3 && statements.every((statement, index) =>
    /^CREATE (TABLE|INDEX) IF NOT EXISTS "FoxeRelayOutbox/.test(statement) &&
    normalize(statement, { identifierQuotes: true }) === normalize(approvedStatements[index], { identifierQuotes: true })), 'FOXE_RELAY_ADDITIVE_SQL_GUARD_FAILED');
  return statements;
}

function validateInvocation(args, env) {
  const requestedMode = args[0];
  if (requestedMode === '--apply') {
    assert(args.length === 3 && args[1] === '--project-id' && args[2] === expectedProjectId, 'FOXE_RELAY_PROJECT_ARGUMENT_REQUIRED');
    assert(env.VERCEL_ENV === 'production' && (!env.VERCEL_PROJECT_ID || env.VERCEL_PROJECT_ID === expectedProjectId), 'FOXE_RELAY_PRODUCTION_PROJECT_REQUIRED');
  } else {
    assert(args.length === 1 && ['before', 'after'].includes(requestedMode), 'FOXE_RELAY_CHECK_MODE_REQUIRED');
  }
  return requestedMode;
}

function validateColumns(columns) {
  assert(columns.length === 11, 'FOXE_RELAY_COLUMN_COUNT_MISMATCH');
  assert(same(columns.map(column => column.column_name).sort(), Object.keys(expectedColumns).sort()), 'FOXE_RELAY_COLUMN_NAMES_MISMATCH');
  for (const column of columns) {
    const [type, nullable, defaultValue] = expectedColumns[column.column_name];
    assert(column.data_type === type && (column.is_nullable === 'YES') === nullable, 'FOXE_RELAY_COLUMN_TYPE_OR_NULLABILITY_MISMATCH');
    assert(column.is_identity === 'NO' && column.is_generated === 'NEVER', 'FOXE_RELAY_GENERATED_COLUMN_UNEXPECTED');
    if (type === 'timestamp without time zone') assert(column.datetime_precision === 3, 'FOXE_RELAY_TIMESTAMP_PRECISION_MISMATCH');
    assert(normalize(column.column_default) === normalize(defaultValue), 'FOXE_RELAY_COLUMN_DEFAULT_MISMATCH');
  }
}

function validateConstraints(constraints) {
  // PostgreSQL versions that catalog NOT NULL constraints report additional type-n entries.
  const ordinary = constraints.filter(constraint => constraint.contype !== 'n');
  for (const constraint of constraints.filter(item => item.contype === 'n')) {
    assert(constraint.convalidated && constraint.columns.length === 1 &&
      expectedColumns[constraint.columns[0]]?.[1] === false, 'FOXE_RELAY_NOT_NULL_CONSTRAINT_MISMATCH');
  }
  assert(ordinary.length === 3, 'FOXE_RELAY_CONSTRAINT_COUNT_MISMATCH');
  const byName = new Map(ordinary.map(constraint => [constraint.conname, constraint]));
  const pk = byName.get('FoxeRelayOutbox_pkey');
  assert(pk && pk.contype === 'p' && pk.convalidated && !pk.condeferrable && !pk.condeferred && same(pk.columns, ['id']), 'FOXE_RELAY_PRIMARY_KEY_MISMATCH');
  const status = byName.get('FoxeRelayOutbox_status_check');
  const attempts = byName.get('FoxeRelayOutbox_attempts_check');
  for (const constraint of [status, attempts]) {
    assert(constraint && constraint.contype === 'c' && constraint.convalidated && !constraint.connoinherit, 'FOXE_RELAY_CHECK_CONSTRAINT_MISSING');
  }
  // PostgreSQL deparses IN as = ANY(ARRAY[...]); accept only these exact equivalents.
  const checkExpression = definition => normalize(definition, { parentheses: true, textCasts: true }).replace(/^CHECK/, '');
  assert([
    "status=ANYARRAY['PENDING','DELIVERED','REVIEW']",
    "statusIN'PENDING','DELIVERED','REVIEW'",
  ].includes(checkExpression(status.definition)), 'FOXE_RELAY_STATUS_CHECK_MISMATCH');
  assert(checkExpression(attempts.definition) === 'attempts>=0', 'FOXE_RELAY_ATTEMPTS_CHECK_MISMATCH');
}

function validateIndexes(indexes) {
  assert(indexes.length === 3, 'FOXE_RELAY_INDEX_COUNT_MISMATCH');
  const expected = {
    FoxeRelayOutbox_pkey: { columns: ['id'], primary: true, unique: true },
    FoxeRelayOutbox_status_nextAttemptAt_idx: { columns: ['status', 'nextAttemptAt'], primary: false, unique: false },
    FoxeRelayOutbox_status_leaseUntil_idx: { columns: ['status', 'leaseUntil'], primary: false, unique: false },
  };
  for (const index of indexes) {
    const match = expected[index.name];
    assert(match, 'FOXE_RELAY_INDEX_NAME_MISMATCH');
    assert(index.indisvalid && index.indisready && index.indislive && index.indimmediate, 'FOXE_RELAY_INDEX_NOT_READY');
    assert(index.method === 'btree' && !index.indisexclusion && index.indisprimary === match.primary && index.indisunique === match.unique, 'FOXE_RELAY_INDEX_KIND_MISMATCH');
    assert(index.predicate === null && index.expressions === null, 'FOXE_RELAY_PARTIAL_OR_EXPRESSION_INDEX_UNEXPECTED');
    assert(index.indnkeyatts === match.columns.length && index.indnatts === match.columns.length &&
      same(index.columns.map(normalize), match.columns), 'FOXE_RELAY_INDEX_COLUMNS_MISMATCH');
  }
}

async function inspect(tx, Prisma, expectedDatabase, expectedSchema, requireRelay, readOnly) {
  const identities = await tx.$queryRaw(Prisma.sql`
    SELECT current_database() AS database, current_schema() AS schema,
           current_setting('search_path') AS search_path,
           current_schemas(false)::text[] AS schemas,
           current_setting('transaction_read_only') AS read_only
  `);
  assert(identities.length === 1, 'FOXE_RELAY_DATABASE_IDENTITY_UNAVAILABLE');
  const identity = identities[0];
  assert(identity.database === expectedDatabase && identity.schema === expectedSchema && same(identity.schemas, [expectedSchema]) &&
    identity.read_only === (readOnly ? 'on' : 'off'), 'FOXE_RELAY_DATABASE_OR_SCHEMA_MISMATCH');

  const relations = await tx.$queryRaw(Prisma.sql`
    SELECT c.relname AS name, c.relkind::text AS kind, c.oid::text AS oid,
           c.relrowsecurity AS row_security, c.relforcerowsecurity AS force_row_security
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = ${expectedSchema} AND c.relname IN (${Prisma.join(tableNames)})
  `);
  const byName = new Map(relations.map(relation => [relation.name, relation]));
  for (const name of crmTables) assert(['r', 'p'].includes(byName.get(name)?.kind), 'FOXE_RELAY_EXPECTED_CRM_TABLE_MISSING');
  const relay = byName.get('FoxeRelayOutbox');
  if (!relay) {
    assert(!requireRelay, 'FOXE_RELAY_TABLE_MISSING_AFTER_APPLY');
    return { identity, tables: Object.fromEntries(tableNames.map(name => [name, byName.has(name)])), relay: 'absent' };
  }
  assert(relay.kind === 'r' && !relay.row_security && !relay.force_row_security, 'FOXE_RELAY_TABLE_KIND_OR_POLICY_MISMATCH');

  const columns = await tx.$queryRaw(Prisma.sql`
    SELECT column_name, data_type, is_nullable, column_default,
           datetime_precision, is_identity, is_generated
    FROM information_schema.columns
    WHERE table_schema = ${expectedSchema} AND table_name = 'FoxeRelayOutbox'
    ORDER BY ordinal_position
  `);
  const constraints = await tx.$queryRaw(Prisma.sql`
    SELECT conname, contype::text, convalidated, condeferrable, condeferred, connoinherit,
           pg_get_constraintdef(oid, false) AS definition,
           ARRAY(SELECT a.attname::text
                 FROM unnest(conkey) WITH ORDINALITY AS k(attnum, position)
                 JOIN pg_catalog.pg_attribute a ON a.attrelid = conrelid AND a.attnum = k.attnum
                 ORDER BY k.position) AS columns
    FROM pg_catalog.pg_constraint
    WHERE conrelid = ${relay.oid}::oid
  `);
  const indexes = await tx.$queryRaw(Prisma.sql`
    SELECT c.relname AS name, am.amname AS method,
           i.indisprimary, i.indisunique, i.indisvalid, i.indisready, i.indislive,
           i.indimmediate, i.indisexclusion, i.indnkeyatts::integer, i.indnatts::integer,
           pg_get_expr(i.indpred, i.indrelid) AS predicate,
           pg_get_expr(i.indexprs, i.indrelid) AS expressions,
           ARRAY(SELECT pg_get_indexdef(i.indexrelid, k.position, false)
                 FROM generate_series(1, i.indnatts) AS k(position) ORDER BY k.position) AS columns
    FROM pg_catalog.pg_index i
    JOIN pg_catalog.pg_class c ON c.oid = i.indexrelid
    JOIN pg_catalog.pg_am am ON am.oid = c.relam
    WHERE i.indrelid = ${relay.oid}::oid
  `);
  validateColumns(columns);
  validateConstraints(constraints);
  validateIndexes(indexes);
  return {
    identity, tables: Object.fromEntries(tableNames.map(name => [name, byName.has(name)])),
    relay: 'compatible', columnCount: columns.length, indexCount: indexes.length,
  };
}

async function main() {
  validateInvocation(process.argv.slice(2), process.env);
  const apply = mode === '--apply';
  const statements = apply ? validateStatements(await readFile(new URL('../prisma/foxe-relay.sql', import.meta.url), 'utf8')) : [];
  const connection = process.env.DATABASE_URL;
  let url;
  try { url = new URL(connection ?? ''); } catch { throw new CheckFailure('FOXE_RELAY_DATABASE_URL_INVALID'); }
  assert(['postgres:', 'postgresql:'].includes(url.protocol) && url.hostname.endsWith('.neon.tech'), 'FOXE_RELAY_POSTGRES_NEON_TARGET_REQUIRED');
  let expectedDatabase;
  try { expectedDatabase = decodeURIComponent(url.pathname.slice(1)); } catch { throw new CheckFailure('FOXE_RELAY_DATABASE_URL_INVALID'); }
  const expectedSchema = url.searchParams.get('schema') || 'public';
  assert(expectedDatabase && !expectedDatabase.includes('/') && /^[A-Za-z_][A-Za-z0-9_]*$/.test(expectedSchema), 'FOXE_RELAY_DATABASE_URL_INVALID');
  const { PrismaClient, Prisma } = require('@prisma/client');
  // Pin the explicitly validated environment URL; never fall back to local env credentials.
  const prisma = new PrismaClient({ log: [], datasources: { db: { url: connection } } });
  try {
    const report = await prisma.$transaction(async tx => {
      if (!apply) {
        // Only transaction configuration and catalog reads in before/after modes.
        await tx.$executeRaw(Prisma.sql`SET TRANSACTION READ ONLY`);
        return inspect(tx, Prisma, expectedDatabase, expectedSchema, mode === 'after', true);
      }
      await tx.$executeRaw(Prisma.sql`SET LOCAL statement_timeout = '10s'`);
      await tx.$executeRaw(Prisma.sql`SET LOCAL lock_timeout = '5s'`);
      const locks = await tx.$queryRaw(Prisma.sql`
        SELECT pg_try_advisory_xact_lock(hashtext('FoxeRelayOutbox'), hashtext(current_schema())) AS acquired
      `);
      assert(locks.length === 1 && locks[0].acquired === true, 'FOXE_RELAY_SCHEMA_LOCK_UNAVAILABLE');
      // Reject an incompatible existing table before DDL; any later mismatch rolls back.
      await inspect(tx, Prisma, expectedDatabase, expectedSchema, false, false);
      for (const statement of statements) await tx.$executeRaw(Prisma.raw(statement));
      return inspect(tx, Prisma, expectedDatabase, expectedSchema, true, false);
    }, {
      isolationLevel: apply ? Prisma.TransactionIsolationLevel.ReadCommitted : Prisma.TransactionIsolationLevel.RepeatableRead,
      maxWait: 5_000, timeout: 30_000,
    });
    console.log(JSON.stringify({
      mode, neonHostname: url.hostname,
      database: report.identity.database, schema: report.identity.schema,
      searchPath: report.identity.search_path, readOnly: !apply,
      tables: report.tables, relay: report.relay,
      ...(report.columnCount ? { columnCount: report.columnCount, indexCount: report.indexCount } : {}),
    }));
  } finally { await prisma.$disconnect(); }
}

main().catch(error => {
  console.error(error instanceof CheckFailure ? error.code : 'FOXE_RELAY_CATALOG_CHECK_UNAVAILABLE');
  process.exitCode = 1;
});
