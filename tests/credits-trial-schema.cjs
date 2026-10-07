// Isolated in-memory PostgreSQL (PGlite) only. No remote DB/env credentials.
// Run with NODE_PATH pointing to an isolated @electric-sql/pglite installation.
// This exercises DDL/constraints/grants, NOT production RPCs or concurrency.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const ddl = fs.readFileSync('docs/migrations/20261007230000_egg_workspace_trial_proposal.sql', 'utf8');
const rollback = fs.readFileSync('docs/migrations/20261007230000_egg_workspace_trial_proposal.rollback.sql', 'utf8');
const id = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
let checks = 0;
async function rejected(db, sql, params, expectedCode) {
  await assert.rejects(db.query(sql, params), error => error.code === expectedCode);
  checks++;
}
async function setup() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE TABLE public.egg_creator_profiles(id uuid PRIMARY KEY);`);
  await db.exec(ddl);
  return db;
}
async function main() {
  const db = await setup();
  try {
    for (let n = 1; n <= 5; n++) {
      await db.query('INSERT INTO auth.users VALUES ($1);', [id(n)]);
      await db.query('INSERT INTO public.egg_creator_profiles VALUES ($1);', [id(n)]);
      await db.query('INSERT INTO public.egg_credit_wallets_v2(workspace_id,billing_generation) VALUES ($1,$2)', [id(n),id(100+n)]);
    }
    const enroll = `INSERT INTO public.egg_credit_trials_v2
      (workspace_id,eligibility_owner_user_id,policy_version,starts_at,expires_at,allowance)
      VALUES ($1,$2,'trial-proposal','2026-10-24T12:00:00Z',$3,$4)`;
    await db.query(enroll,[id(1),id(1),'2026-10-31T12:00:00Z',30]);
    await db.query(enroll,[id(2),id(2),'2026-10-31T12:00:00Z',30]);
    // Same account cannot gain another trial by opening a second workspace.
    await rejected(db,enroll,[id(3),id(1),'2026-10-31T12:00:00Z',30],'23505');
    await rejected(db,enroll,[id(1),id(3),'2026-10-31T12:00:00Z',30],'23505');
    await rejected(db,enroll,[id(3),id(3),'2026-10-31T11:59:59Z',30],'23514');
    await rejected(db,enroll,[id(3),id(3),'infinity',30],'23514');
    for (const credits of [0,151]) await rejected(db,enroll,[id(3),id(3),'2026-10-31T12:00:00Z',credits],'23514');
    // Preserve absolute 168-hour duration across a DST transition.
    const duration = await db.query('SELECT extract(epoch FROM expires_at-starts_at)::integer AS seconds FROM public.egg_credit_trials_v2 WHERE workspace_id=$1',[id(1)]);
    assert.equal(duration.rows[0].seconds,604800); checks++;

    const period = `INSERT INTO public.egg_credit_periods_v2
      (workspace_id,period_key,period_start,period_end,plan,trial_workspace_id,allowance,available,billing_generation)
      VALUES ($1,$2,'2026-10-24T12:00:00Z',$3,'trial',$4,$5,$5,$6)`;
    await rejected(db,period,[id(1),'trial','2026-10-31T12:00:01Z',id(1),30,id(101)],'23503');
    await rejected(db,period,[id(1),'trial','2026-10-31T12:00:00Z',id(1),31,id(101)],'23503');
    await rejected(db,period,[id(1),'trial','2026-10-31T12:00:00Z',null,30,id(101)],'23514');
    await rejected(db,period,[id(3),'trial','2026-10-31T12:00:00Z',id(1),30,id(103)],'23514');
    await db.query(period,[id(1),'trial','2026-10-31T12:00:00Z',id(1),30,id(101)]);
    await db.query(period,[id(2),'second-trial','2026-10-31T12:00:00Z',id(2),30,id(102)]);
    await rejected(db,period,[id(1),'refill','2026-10-31T12:00:00Z',id(1),30,id(101)],'23505');
    await rejected(db,'UPDATE public.egg_credit_periods_v2 SET available=31 WHERE workspace_id=$1',[id(1)],'23514');
    await rejected(db,'UPDATE public.egg_credit_periods_v2 SET payer_user_id=$1 WHERE workspace_id=$1',[id(1)],'23514');
    await rejected(db,"UPDATE public.egg_credit_wallets_v2 SET current_period_key='second-trial' WHERE workspace_id=$1",[id(1)],'23503');

    const op = `INSERT INTO public.egg_credit_operations_v2
      (call_id,workspace_id,actor_user_id,idempotency_key,request_hash,policy_version,action,amount,reserved_period_key)
      VALUES ($1,$2,$3,$4,$5,'preview','egg_this_generate',$6,$7)`;
    await db.query(op,[id(201),id(1),id(1),'same-key','a'.repeat(64),5,'trial']);
    await rejected(db,op,[id(202),id(1),id(1),'same-key','a'.repeat(64),5,'trial'],'23505');
    await db.query(op,[id(203),id(2),id(2),'same-key','a'.repeat(64),5,'second-trial']);
    await rejected(db,op,[id(204),id(1),id(1),'cross','a'.repeat(64),5,'second-trial'],'23503');
    await rejected(db,op,[id(205),id(1),id(1),'amount','a'.repeat(64),6,'trial'],'23514');
    await rejected(db,"UPDATE public.egg_credit_operations_v2 SET provider_status='unknown' WHERE call_id=$1",[id(201)],'23514');
    await rejected(db,"UPDATE public.egg_credit_operations_v2 SET credit_status='committed' WHERE call_id=$1",[id(201)],'23514');
    await rejected(db,"UPDATE public.egg_credit_operations_v2 SET credit_status='refunded',refunded_at=now(),refund_restored=6 WHERE call_id=$1",[id(201)],'23514');

    // Client access denied; service can insert an enrollment but cannot mutate it.
    for (const table of ['wallets','trials','periods','operations']) {
      const privileges = await db.query(`SELECT
        has_table_privilege('anon','public.egg_credit_${table}_v2','SELECT') AS anon_read,
        has_table_privilege('authenticated','public.egg_credit_${table}_v2','INSERT') AS client_write,
        has_table_privilege('service_role','public.egg_credit_${table}_v2','DELETE') AS server_delete`);
      assert.deepEqual(privileges.rows[0],{anon_read:false,client_write:false,server_delete:false}); checks++;
    }
    await db.exec('SET ROLE service_role');
    await db.query(enroll,[id(3),id(3),'2026-10-31T12:00:00Z',30]);
    await rejected(db,'UPDATE public.egg_credit_trials_v2 SET allowance=150 WHERE workspace_id=$1',[id(1)],'42501');
    await rejected(db,'DELETE FROM public.egg_credit_trials_v2 WHERE workspace_id=$1',[id(1)],'42501');
    await rejected(db,"UPDATE public.egg_credit_periods_v2 SET plan='free',trial_workspace_id=NULL WHERE workspace_id=$1",[id(1)],'42501');
    await rejected(db,"UPDATE public.egg_credit_operations_v2 SET actor_user_id=$1 WHERE call_id=$2",[id(2),id(201)],'42501');
    await db.query('UPDATE public.egg_credit_periods_v2 SET available=25 WHERE workspace_id=$1',[id(1)]);
    await db.exec('RESET ROLE; SET ROLE authenticated');
    await rejected(db,'SELECT * FROM public.egg_credit_trials_v2',[],'42501');
    await db.exec('RESET ROLE');
    await assert.rejects(db.exec(rollback), /history exists/); checks++;
    await db.exec('ROLLBACK');
    assert.equal((await db.query('SELECT count(*)::integer AS count FROM public.egg_credit_trials_v2')).rows[0].count,3); checks++;
  } finally { await db.close(); }
  const empty = await setup();
  try {
    await empty.exec(rollback);
    assert.equal((await empty.query("SELECT count(*)::integer AS count FROM pg_tables WHERE tablename LIKE 'egg_credit_%_v2'")).rows[0].count,0); checks++;
  } finally { await empty.close(); }
  console.log(`Isolated PostgreSQL schema checks PASS (${checks}). No remote DB, RPC, concurrency, provider or payment test.`);
}
main().catch(error => { console.error(error); process.exitCode=1; });
