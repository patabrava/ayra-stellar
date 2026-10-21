// Local, in-memory check of the funding-classification migration against real
// Postgres (PGlite). It never connects to a Supabase project. Requires:
//   npm i --no-save @electric-sql/pglite@0.3.14
// then: npm run verify:funding-classification-sql
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

let PGlite;
try {
  ({ PGlite } = await import("@electric-sql/pglite"));
} catch {
  console.error("Missing @electric-sql/pglite. Run: npm i --no-save @electric-sql/pglite@0.3.14");
  process.exit(2);
}

const MIGRATIONS = path.join(process.cwd(), "supabase", "migrations");
const CLASSIFICATION_MIGRATION = "0017_public_funding_classification.sql";
const DATA_ONLY_MIGRATIONS = new Set(["0002_seed_grantee_contact_link.sql"]);

const ID = {
  adminUser: "00000000-0000-4000-8000-0000000000a1",
  stewardUser: "00000000-0000-4000-8000-0000000000a2",
  admin: "10000000-0000-4000-8000-000000000001",
  steward: "10000000-0000-4000-8000-000000000002",
  bystander: "10000000-0000-4000-8000-000000000003",
  track: "20000000-0000-4000-8000-000000000001",
  projectA: "30000000-0000-4000-8000-00000000000a",
  projectB: "30000000-0000-4000-8000-00000000000b",
  granteeA: "40000000-0000-4000-8000-00000000000a",
  granteeB: "40000000-0000-4000-8000-00000000000b",
  batchAPubnet: "50000000-0000-4000-8000-0000000000a1",
  batchATestnet: "50000000-0000-4000-8000-0000000000a2",
  batchADraft: "50000000-0000-4000-8000-0000000000a3",
  batchBPubnet: "50000000-0000-4000-8000-0000000000b1",
};
const SOURCE = "VIIO-PVD-2026-06-07-001";
const EVIDENCE = "drive:AYRA/IMPACT/qa-validation-receipt-2026-06-07.pdf";

const SUPABASE_STUB = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as
  $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;

create schema storage;
create table storage.buckets (
  id text primary key, name text not null unique, owner uuid, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[],
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
  name text, owner uuid, metadata jsonb, created_at timestamptz default now()
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as
  $$ select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)] $$;
`;

const results = [];
const pass = (label, detail = "") => results.push({ ok: true, label, detail });
const fail = (label, detail = "") => results.push({ ok: false, label, detail });

async function migrationFiles() {
  return (await readdir(MIGRATIONS)).filter((name) => name.endsWith(".sql")).sort();
}

async function applyMigrations(db, { through }) {
  for (const name of await migrationFiles()) {
    if (through && name > through) break;
    // Data-only link to rows that exist in seed/production, not in this fixture.
    if (DATA_ONLY_MIGRATIONS.has(name)) continue;
    const sql = (await readFile(path.join(MIGRATIONS, name), "utf8"))
      // gen_random_uuid() is core Postgres; no pgcrypto-only function is used.
      .replace(/create extension if not exists pgcrypto;/gi, "-- pgcrypto: core gen_random_uuid() used");
    try {
      await db.exec(sql);
    } catch (error) {
      throw new Error(`${name}: ${error.message}`);
    }
  }
}

async function seed(db) {
  await db.exec(`
    insert into auth.users (id, email) values
      ('${ID.adminUser}', 'admin@example.test'), ('${ID.stewardUser}', 'steward@example.test');
    insert into public.profiles (id, auth_user_id, email, display_name) values
      ('${ID.admin}', '${ID.adminUser}', 'admin@example.test', 'Reviewer'),
      ('${ID.steward}', '${ID.stewardUser}', 'steward@example.test', 'Steward'),
      ('${ID.bystander}', null, 'bystander@example.test', 'Bystander');
    insert into public.user_roles (profile_id, role) values ('${ID.admin}', 'admin');
    insert into public.tracks (id, slug, name) values ('${ID.track}', 'providencia', 'Providencia');
    insert into public.initiatives (id, track_id, code, slug, name, headline, description, target_metric_label, status) values
      ('${ID.projectA}', '${ID.track}', 'PVD-A', 'project-a', 'Project A', 'A', 'A', 'trees', 'live'),
      ('${ID.projectB}', '${ID.track}', 'PVD-B', 'project-b', 'Project B', 'B', 'B', 'dogs', 'funding');
    insert into public.user_roles (profile_id, role, initiative_id) values ('${ID.steward}', 'steward', '${ID.projectA}');
    insert into public.grantees (id, initiative_id, name) values
      ('${ID.granteeA}', '${ID.projectA}', 'Grantee A legal entity'),
      ('${ID.granteeB}', '${ID.projectB}', 'Grantee B legal entity');
    insert into public.funding_batches (id, initiative_id, code, period_label, status, created_by_profile_id, stellar_network, payment_kind) values
      ('${ID.batchAPubnet}', '${ID.projectA}', 'A-PUB', 'Jun 2026', 'settled', '${ID.admin}', 'pubnet', 'advance'),
      ('${ID.batchATestnet}', '${ID.projectA}', 'A-TEST', 'May 2026', 'settled', '${ID.admin}', 'testnet', 'advance'),
      ('${ID.batchADraft}', '${ID.projectA}', 'A-DRAFT', 'Jul 2026', 'draft', '${ID.admin}', 'pubnet', 'advance'),
      ('${ID.batchBPubnet}', '${ID.projectB}', 'B-PUB', 'Jun 2026', 'settled', '${ID.admin}', 'pubnet', 'advance');
  `);
  const lines = [
    [ID.batchAPubnet, "a".repeat(64)],
    [ID.batchATestnet, "b".repeat(64)],
    [ID.batchBPubnet, "c".repeat(64)],
  ];
  for (const [batchId, hash] of lines) {
    await db.query(
      `insert into public.batch_line_items
        (batch_id, category, amount_usdc, status, transaction_hash, payment_asset_code, payment_asset_issuer, payment_asset_amount)
       values ($1, 'validation', 5, 'settled', $2, 'USDC', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN', 5)`,
      [batchId, hash],
    );
  }
}

async function as(db, ctx, fn) {
  return db.transaction(async (tx) => {
    const claims = ctx.sub ? { sub: ctx.sub, role: ctx.role } : { role: ctx.role };
    await tx.query(
      "select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claims', $2, true)",
      [ctx.sub ?? "", JSON.stringify(claims)],
    );
    if (ctx.role !== "postgres") await tx.exec(`set local role ${ctx.role}`);
    return fn(tx);
  });
}

const ANON = { role: "anon" };
const STEWARD = { role: "authenticated", sub: ID.stewardUser };
const ADMIN = { role: "authenticated", sub: ID.adminUser };
const SERVICE = { role: "service_role" };
const OWNER = { role: "postgres" };

const classify = (tx, args) =>
  tx.query("select public.admin_record_batch_funding_classification($1, $2, $3, $4, $5, $6)", [
    args.batchId,
    args.initiativeId,
    args.purpose,
    args.source ?? SOURCE,
    args.recipient ?? null,
    args.evidence ?? EVIDENCE,
  ]);

async function expectError(label, run, pattern) {
  try {
    await run();
    fail(label, "expected an error, but the statement succeeded");
  } catch (error) {
    if (pattern.test(error.message)) pass(label, error.message);
    else fail(label, `unexpected error: ${error.message}`);
  }
}

async function expectOk(label, run, check) {
  try {
    const value = await run();
    const problem = check ? check(value) : null;
    if (problem) fail(label, problem);
    else pass(label);
  } catch (error) {
    fail(label, error.message);
  }
}

const receiptsSnapshot = (client) =>
  client.query("select * from public.public_batch_receipts order by line_item_id").then((result) => ({
    columns: result.fields.map((field) => field.name),
    rows: result.rows,
  }));

// 1. Before 0017: the reader's view is absent, so the app must fail closed.
const before = await PGlite.create();
await before.exec(SUPABASE_STUB);
const files = await migrationFiles();
const preClassification = files[files.indexOf(CLASSIFICATION_MIGRATION) - 1];
await applyMigrations(before, { through: preClassification });
await seed(before);
await expectError(
  "pre-migration: public funding-purpose view is absent (app reads it as UNVERIFIED)",
  () => as(before, ANON, (tx) => tx.query("select * from public.public_batch_funding_purposes")),
  /does not exist/i,
);
const legacyReceipts = await as(before, ANON, (tx) => receiptsSnapshot(tx));
await before.close();

// 2. With 0017 applied on the same fixture.
const db = await PGlite.create();
await db.exec(SUPABASE_STUB);
await applyMigrations(db, {});
await seed(db);

await expectOk("legacy receipts: public_batch_receipts columns and rows unchanged by 0017", async () => {
  const current = await as(db, ANON, (tx) => receiptsSnapshot(tx));
  return JSON.stringify(current) === JSON.stringify(legacyReceipts)
    ? null
    : "public_batch_receipts differs after the classification migration";
});
await expectOk("unclassified: anon view is empty before any review", () =>
  as(db, ANON, (tx) => tx.query("select * from public.public_batch_funding_purposes")),
  (result) => (result.rows.length === 0 ? null : `expected 0 rows, got ${result.rows.length}`),
);

await expectError("anon cannot read provenance table", () =>
  as(db, ANON, (tx) => tx.query("select * from public.batch_funding_classifications")), /permission denied/i);
await expectError("anon cannot call the classification RPC", () =>
  as(db, ANON, (tx) => classify(tx, { batchId: ID.batchAPubnet, initiativeId: ID.projectA, purpose: "technical_validation" })),
  /permission denied/i);
await expectError("anon cannot write through the public view", () =>
  as(db, ANON, (tx) => tx.query(`insert into public.public_batch_funding_purposes values ('${ID.batchAPubnet}', 'approved_project_disbursement')`)),
  /permission denied|cannot insert/i);
await expectError("non-admin steward cannot classify", () =>
  as(db, STEWARD, (tx) => classify(tx, { batchId: ID.batchAPubnet, initiativeId: ID.projectA, purpose: "technical_validation" })),
  /signed-in admin reviewer is required/i);
await expectError("steward cannot insert provenance directly", () =>
  as(db, STEWARD, (tx) => tx.query(
    `insert into public.batch_funding_classifications values ('${ID.batchAPubnet}', '${ID.projectA}', 'approved_project_disbursement', (select id from public.source_records limit 1), '${ID.granteeA}', 'forged evidence', '${ID.admin}', now())`)),
  /permission denied/i);
await expectError("admin cannot bypass the RPC with a direct insert (forged reviewer)", () =>
  as(db, ADMIN, (tx) => tx.query(
    `insert into public.batch_funding_classifications values ('${ID.batchAPubnet}', '${ID.projectA}', 'approved_project_disbursement', (select id from public.source_records limit 1), '${ID.granteeA}', 'forged evidence', '${ID.bystander}', now())`)),
  /permission denied/i);
await expectError("service-role scripts cannot backfill classifications", () =>
  as(db, SERVICE, (tx) => tx.query(
    `insert into public.batch_funding_classifications values ('${ID.batchAPubnet}', '${ID.projectA}', 'technical_validation', (select id from public.source_records limit 1), null, 'automatic backfill', '${ID.admin}', now())`)),
  /permission denied/i);
await expectError("service role has no reviewer identity for the RPC", () =>
  as(db, SERVICE, (tx) => classify(tx, { batchId: ID.batchAPubnet, initiativeId: ID.projectA, purpose: "technical_validation" })),
  /signed-in admin reviewer is required|permission denied/i);

await expectError("admin: batch from project A cannot be filed under project B", () =>
  as(db, ADMIN, (tx) => classify(tx, { batchId: ID.batchAPubnet, initiativeId: ID.projectB, purpose: "technical_validation" })),
  /different project/i);
await expectError("admin: approved disbursement without a legal recipient fails", () =>
  as(db, ADMIN, (tx) => classify(tx, { batchId: ID.batchAPubnet, initiativeId: ID.projectA, purpose: "approved_project_disbursement" })),
  /legal recipient/i);
await expectError("admin: recipient registered to another project fails", () =>
  as(db, ADMIN, (tx) => classify(tx, { batchId: ID.batchAPubnet, initiativeId: ID.projectA, purpose: "approved_project_disbursement", recipient: ID.granteeB })),
  /not a registered grantee of this project/i);
await expectError("admin: unregistered source record fails", () =>
  as(db, ADMIN, (tx) => classify(tx, { batchId: ID.batchAPubnet, initiativeId: ID.projectA, purpose: "technical_validation", source: "INVENTED-SOURCE" })),
  /source record is not registered/i);
await expectError("admin: missing evidence fails", () =>
  as(db, ADMIN, (tx) => classify(tx, { batchId: ID.batchAPubnet, initiativeId: ID.projectA, purpose: "technical_validation", evidence: "  " })),
  /evidence reference is required/i);
await expectError("admin: testnet transfer cannot be an approved disbursement", () =>
  as(db, ADMIN, (tx) => classify(tx, { batchId: ID.batchATestnet, initiativeId: ID.projectA, purpose: "approved_project_disbursement", recipient: ID.granteeA })),
  /testnet transfers cannot be project disbursements/i);
await expectError("admin: draft batch cannot be classified", () =>
  as(db, ADMIN, (tx) => classify(tx, { batchId: ID.batchADraft, initiativeId: ID.projectA, purpose: "technical_validation" })),
  /only submitted or settled/i);
await expectError("admin: unknown purpose fails", () =>
  as(db, ADMIN, (tx) => classify(tx, { batchId: ID.batchAPubnet, initiativeId: ID.projectA, purpose: "funded" })),
  /unknown funding purpose/i);

await expectOk("admin: records the 5-USDC rail check as technical validation", () =>
  as(db, ADMIN, (tx) => classify(tx, { batchId: ID.batchAPubnet, initiativeId: ID.projectA, purpose: "technical_validation" })));
await expectOk("reviewer is the calling admin and an audit row exists", () =>
  db.query(`select c.reviewed_by_profile_id, c.reviewed_at, a.actor_profile_id, a.action
            from public.batch_funding_classifications c
            join public.audit_logs a on a.entity_id = c.batch_id and a.action = 'funding.purpose_classified'
            where c.batch_id = '${ID.batchAPubnet}'`),
  (result) => {
    const row = result.rows[0];
    if (!row) return "no classification + audit row";
    if (row.reviewed_by_profile_id !== ID.admin || row.actor_profile_id !== ID.admin) return "reviewer is not the calling admin";
    return row.reviewed_at ? null : "missing reviewed_at";
  });
await expectError("admin: an existing classification cannot be replaced", () =>
  as(db, ADMIN, (tx) => classify(tx, { batchId: ID.batchAPubnet, initiativeId: ID.projectA, purpose: "approved_project_disbursement", recipient: ID.granteeA })),
  /already classified/i);
await expectError("admin cannot update provenance through the table API", () =>
  as(db, ADMIN, (tx) => tx.query(`update public.batch_funding_classifications set public_funding_purpose = 'approved_project_disbursement' where batch_id = '${ID.batchAPubnet}'`)),
  /permission denied/i);
await expectError("even the table owner cannot rewrite a reviewed classification", () =>
  as(db, OWNER, (tx) => tx.query(`update public.batch_funding_classifications set public_funding_purpose = 'approved_project_disbursement' where batch_id = '${ID.batchAPubnet}'`)),
  /immutable/i);
await expectError("even the table owner cannot delete a reviewed classification", () =>
  as(db, OWNER, (tx) => tx.query(`delete from public.batch_funding_classifications where batch_id = '${ID.batchAPubnet}'`)),
  /immutable/i);

await expectOk("admin: approves project B's pubnet transfer to project B's own recipient", () =>
  as(db, ADMIN, (tx) => classify(tx, { batchId: ID.batchBPubnet, initiativeId: ID.projectB, purpose: "approved_project_disbursement", recipient: ID.granteeB })));
await expectOk("anon view exposes only batch_id + purpose, per project, no draft/testnet leakage", () =>
  as(db, ANON, (tx) => tx.query("select * from public.public_batch_funding_purposes order by batch_id")),
  (result) => {
    const columns = result.fields.map((field) => field.name).join(",");
    if (columns !== "batch_id,public_funding_purpose") return `unexpected columns ${columns}`;
    const rows = JSON.stringify(result.rows);
    const expected = JSON.stringify([
      { batch_id: ID.batchAPubnet, public_funding_purpose: "technical_validation" },
      { batch_id: ID.batchBPubnet, public_funding_purpose: "approved_project_disbursement" },
    ]);
    return rows === expected ? null : `unexpected rows ${rows}`;
  });
await expectOk("receipts still unchanged after classifications are recorded", async () => {
  const current = await as(db, ANON, (tx) => receiptsSnapshot(tx));
  return JSON.stringify(current) === JSON.stringify(legacyReceipts)
    ? null
    : "public_batch_receipts changed after classification";
});
await expectOk("migration contains no backfill of existing payments", async () => {
  const sql = await readFile(path.join(MIGRATIONS, CLASSIFICATION_MIGRATION), "utf8");
  const outsideFunction = sql.replace(/\$\$[\s\S]*?\$\$/g, "");
  return /insert\s+into\s+public\.batch_funding_classifications/i.test(outsideFunction)
    ? "top-level INSERT into batch_funding_classifications found"
    : null;
});
await db.close();

for (const result of results) {
  console.log(`${result.ok ? "PASS" : "FAIL"}  ${result.label}${result.detail ? `  [${result.detail}]` : ""}`);
}
const failed = results.filter((result) => !result.ok).length;
console.log(`\nSkipped data-only migrations: ${[...DATA_ONLY_MIGRATIONS].join(", ")}`);
console.log(`${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
