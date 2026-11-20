// The database, for real: every migration applied in order to an actual
// Postgres (PGlite — Postgres compiled to run inside Node), on top of a
// stand-in for the parts of Supabase they build on
// (supabase/tests/supabase_stub.sql). Then the same privacy and recovery
// check scripts that are run by hand in the SQL editor, plus checks for
// things those scripts don't cover.
//
// This doesn't replace running the checks on the live project after
// applying a migration — Supabase itself isn't here — but a migration that
// doesn't apply, or a rule that stops holding, now fails before it ships.
import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SUPABASE = join(process.cwd(), "supabase");
const read = (...p) => readFileSync(join(SUPABASE, ...p), "utf8");
const MIGRATIONS = readdirSync(join(SUPABASE, "migrations")).filter((f) => f.endsWith(".sql")).sort();

/** @type {PGlite} */
let db;
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

// Runs `sql` signed in as `userId`, the way a request through the API does,
// and undoes nothing: each call is its own transaction.
async function as(userId, sql, params = []) {
  return db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: userId, role: "authenticated" })]);
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [userId || ""]);
    await tx.exec(userId ? "set local role authenticated" : "set local role anon");
    return tx.query(sql, params);
  });
}
// A check script ends by raising an exception that carries its results.
async function runCheckScript(file) {
  try {
    await db.exec(read("tests", file));
  } catch (e) {
    return e.message;
  }
  return "the script finished without reporting";
}

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(read("tests", "supabase_stub.sql"));
  for (const f of MIGRATIONS) {
    try {
      await db.exec(read("migrations", f));
    } catch (e) {
      throw new Error(`${f} did not apply: ${e.message}`);
    }
  }
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${A}', 'a@users.forestapp.invalid', '{"username":"anna"}'),
      ('${B}', 'b@users.forestapp.invalid', '{"username":"ben"}'),
      ('${C}', 'c@users.forestapp.invalid', '{"username":"cai"}');
    -- Old enough not to need a guardian, the way the age gate leaves them.
    select set_config('app.consent_write', 'on', false);
    update public.users set consent_state = 'not_required', disclosure_locked = false;
    select set_config('app.consent_write', 'off', false);
    update public.users set display_name = 'anna', discovery_enabled = true where id = '${A}';
    update public.users set display_name = 'ben', discovery_enabled = true where id = '${B}';
    update public.users set display_name = 'cai', discovery_enabled = true where id = '${C}';
    insert into public.interests (id, user_id, name) values ('tA', '${A}', 'Piano'), ('tC', '${C}', 'Chess');
  `);
}, 120000);

describe("migrations", () => {
  it(`all ${MIGRATIONS.length} apply, in order, to a fresh database`, async () => {
    const { rows } = await db.query("select count(*)::int as n from information_schema.tables where table_schema = 'public'");
    expect(rows[0].n).toBeGreaterThan(10);
  });
});

describe("check scripts", () => {
  it("privacy checks all pass", async () => {
    const report = await runCheckScript("privacy_checks.sql");
    const m = report.match(/PRIVACY CHECKS: (\d+) of (\d+) passed/);
    expect(m, report).not.toBeNull();
    expect(m[1], report).toBe(m[2]);
  });

  it("recovery checks all pass", async () => {
    const report = await runCheckScript("recovery_checks.sql");
    const m = report.match(/RECOVERY CHECKS: (\d+) of (\d+) passed/);
    expect(m, report).not.toBeNull();
    expect(m[1], report).toBe(m[2]);
  });
});

describe("sharing", () => {
  it("saves a public entry and a public photo (20261114010000)", async () => {
    await as(A, "insert into public.entries (id, interest_id, date, text, visibility) values ('pub1', 'tA', '2026-11-01', 'scales today', 'public')");
    await as(A, "insert into public.photos (id, interest_id, caption, visibility) values ('ph1', 'tA', 'my piano', 'public')");
    const { rows } = await db.query("select count(*)::int as n from public.entries where id = 'pub1'");
    expect(rows[0].n).toBe(1);
  });

  it("refuses blocked words in public, but not in a private diary", async () => {
    const { rows: [{ word }] } = await db.query("select term as word from public.blocked_terms limit 1").catch(() => ({ rows: [{ word: null }] }));
    const bad = word || "fuck";
    await expect(as(A, "insert into public.entries (id, interest_id, date, text, visibility) values ('pub2', 'tA', '2026-11-02', $1, 'public')", [bad]))
      .rejects.toThrow(/words in it/);
    await as(A, "insert into public.entries (id, interest_id, date, text, visibility) values ('priv2', 'tA', '2026-11-02', $1, 'private')", [bad]);
  });

  it("never shows one student's private entry to another", async () => {
    await as(A, "insert into public.entries (id, interest_id, date, text, visibility) values ('secret', 'tA', '2026-11-03', 'diary', 'private')");
    const { rows } = await as(B, "select id from public.entries where id = 'secret'");
    expect(rows).toEqual([]);
  });
});

describe("blocking (20261114020000)", () => {
  it("hides both students from each other — profile, trees, entries and photos — and no one else", async () => {
    await as(C, "insert into public.entries (id, interest_id, date, text, visibility) values ('cPub', 'tC', '2026-11-04', 'opening', 'public')");
    await as(C, "insert into public.photos (id, interest_id, caption, visibility) values ('cPh', 'tC', 'board', 'public')");
    const sees = async (viewer, owner) => {
      const [u, t, e, p] = await Promise.all([
        as(viewer, "select 1 from public.users where id = $1", [owner]),
        as(viewer, "select 1 from public.interests where user_id = $1", [owner]),
        as(viewer, "select 1 from public.entries e join public.interests i on i.id = e.interest_id where i.user_id = $1", [owner]),
        as(viewer, "select 1 from public.photos p join public.interests i on i.id = p.interest_id where i.user_id = $1", [owner]),
      ].map((q) => q.catch(() => ({ rows: [] }))));
      return [u, t, e, p].map((r) => r.rows.length > 0);
    };
    expect(await sees(B, C)).toEqual([true, true, true, true]);

    await as(C, "insert into public.blocks (user_id, blocked_user_id) values ($1, $2)", [C, B]);
    expect(await sees(B, C)).toEqual([false, false, false, false]);  // the blocked one sees nothing
    expect((await sees(C, B))[0]).toBe(false);                       // nor does the blocker see them
    expect(await sees(A, C)).toEqual([true, true, true, true]);      // everyone else is unaffected
    // And it gives nothing away about anyone else's blocks.
    const { rows } = await as(B, "select * from public.blocks");
    expect(rows).toEqual([]);
  });
});

describe("crash reports (20261114000000)", () => {
  it("can be sent while signed in, and read by no one through the API", async () => {
    const { rows } = await as(A, "select public.report_crash('TypeError: x is null', 'at Home', '/interest/:id', '1.0.0', 'web') as ok");
    expect(rows[0].ok).toBe(true);
    await expect(as(A, "select * from public.crash_reports")).rejects.toThrow(/permission denied/);
    await expect(as(B, "select * from public.crash_reports")).rejects.toThrow(/permission denied/);
    const { rows: stored } = await db.query(`select user_id, message, "where" from public.crash_reports`);
    expect(stored).toEqual([{ user_id: A, message: "TypeError: x is null", where: "/interest/:id" }]);
  });

  it("can't be sent signed out, or written directly", async () => {
    await expect(as(null, "select public.report_crash('x')")).rejects.toThrow(/permission denied/);
    await expect(as(A, "insert into public.crash_reports (user_id, message) values ($1, 'x')", [A])).rejects.toThrow(/permission denied/);
  });

  it("trims long fields and stops at 20 a day per account", async () => {
    await as(B, "select public.report_crash(repeat('m', 2000), repeat('s', 9000))");
    const { rows: [r] } = await db.query(`select length(message) as m, length(stack) as s from public.crash_reports where user_id = '${B}'`);
    expect([r.m, r.s]).toEqual([500, 4000]);
    for (let i = 0; i < 25; i++) await as(B, "select public.report_crash($1)", ["crash " + i]);
    const { rows: [{ n }] } = await db.query(`select count(*)::int as n from public.crash_reports where user_id = '${B}'`);
    expect(n).toBe(20);
  });

  it("are shown to moderators grouped and without names, and to nobody else (20261119000000)", async () => {
    await as(C, "select public.report_crash('RangeError: boom', 'at X', '/journal', '1.2.0', 'ios')");
    await as(C, "select public.report_crash('RangeError: boom', 'at Y', '/journal', '1.2.1', 'ios')");
    await expect(as(C, "select public.crash_digest()")).rejects.toThrow(/not a moderator/);
    await db.exec(`insert into public.moderators (user_id) values ('${A}')`);
    const { rows: [{ d }] } = await as(A, "select public.crash_digest() as d");
    const boom = d.find((g) => g.message === "RangeError: boom");
    expect(boom).toMatchObject({ where: "/journal", times: 2, this_week: 2, accounts: 1, version: "1.2.1", stack: "at Y", platforms: ["ios"] });
    expect(JSON.stringify(d)).not.toContain(C);
    await db.exec(`delete from public.moderators where user_id = '${A}'`);
  });

  it("clears reports older than 90 days, and goes with the account", async () => {
    await db.exec(`update public.crash_reports set at = now() - interval '91 days' where user_id = '${A}'`);
    await as(B, "select public.report_crash('x')"); // B is at the limit: refused, nothing cleared
    await db.exec(`delete from public.crash_reports where user_id = '${B}' and message like 'crash %'`);
    await as(B, "select public.report_crash('fresh')");
    const { rows: [{ n: oldOnes }] } = await db.query(`select count(*)::int as n from public.crash_reports where user_id = '${A}'`);
    expect(oldOnes).toBe(0);
    await db.exec(`delete from auth.users where id = '${B}'`);
    const { rows: [{ n: left }] } = await db.query(`select count(*)::int as n from public.crash_reports where user_id = '${B}'`);
    expect(left).toBe(0);
  });
});
