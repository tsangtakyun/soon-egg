# Creator-workspace wallet approval design — 2026-10-07 revision

Design/DDL only. Nothing applied; no RPC, worker, payment flow or deployment added.
Tommy's latest confirmed rules supersede the user-wallet proposal at commit
7db96654e3174c5c24093f2087cf6e2352bbb8f5.

## Confirmed rules

- Each creator workspace has its own plan/wallet. One payer with multiple
  workspaces does not share balances or a single subscription entitlement.
- Free 30/month, Hong Kong time first-of-month reset; Creator HK$98/month,
  150 per paid subscription cycle. Included credits do not accumulate.
- Light 1: SOON AI conversation, short reply. Standard 3: script, full reply.
  Heavy 5: EggThis, image/screenshot reply.
- Subtitle 3 per minute, includes transcription and refinement;
  3 × max(1, ceil(server-verified seconds / 60)). This is a commercial decision,
  not a verified supplier-cost estimate. Fal/retry cost uncertainty stays a risk.
- Unknown result: refund 15 minutes after first recorded unknown state; no
  automatic provider redispatch. Late result after refund is delivered, no re-debit.
- Cross-period refund records reversal only; adds nothing to the new period.

## Target, scope and minimal schema

New draft: migrations/20261007180000_egg_workspace_wallet_proposal.sql and matching
.rollback.sql, **EGG Supabase only**, alongside egg_creator_profiles and auth.users.
Old 160000/121000 drafts targeted a user/Master wallet and must not be applied.
No existing data or legacy purchased credits are migrated/changed.

Three tables are the minimal proposed scope: workspace wallet identity/current
period pointer; immutable-identity period snapshots with remaining balance;
logical operation ledger. The additional period table is proposed for approval
because a single mutable row cannot retain unique workspace/period grants,
old payer snapshots and an authoritative cross-period refund association.

- Wallet PK workspace_id; payer_user_id separate; subscription unique to wallet.
- Period PK (workspace_id, period_key); unique invoice and subscription/start
  prevent the same paid grant being assigned to two workspaces.
- Operation global call_id UUID PK; UNIQUE(workspace_id, idempotency_key).
  actor_user_id records submitter, not wallet owner or payer.
- Composite FK operation(workspace_id, reserved_period_key) → period, and wallet
  current pointer → its own period; cannot reference another workspace's period.
- No cascade deletes. No public/client policies. Explicit service-role DML only.
  Server-only result references, hashes and payer IDs are not exposed to members.
- DDL constraints are not a substitute for auth, atomic transitions or trusted
  duration verification. No RPC/worker is provided; current disabled runtime is
  incompatible and **must not be enabled**.

Before any apply: confirm target project, table absence/collisions, workspace
and auth FK schema, role/default grants, locks, backup, and separate approval.
Draft assumes one paid invoice funds one workspace billing period; proration,
annual grants and plan changes need an explicit approved grant policy.

## Authorization and payer lifecycle

Use verified Web session or App bearer and membership in the explicitly selected
workspace on every request; client workspace cookie/header is not authorization.
Revalidate membership transactionally before reserve/dispatch. Server chooses
action/price: presence of screenshot/image cannot be disguised as short/text reply.
Members may use tools; owner/admin may view workspace usage. Proposed conservative
billing permission is owner only. Payer identity alone does not grant workspace
access, result access, owner role or permission to transfer billing. Admin billing
delegation needs an explicit product decision, not inferred team-edit permission.

Billing payer change requires owner authorization plus new payer authenticated
consent. Preserve former payer/actor snapshots. Membership leave/removal must
not erase, transfer, merge or refill wallet and must not silently cancel a
subscription or charge a replacement payer. Former payer can still manage their
own existing payment instrument/cancellation through a separately verified
billing relationship, without restoring tool access. Replacing payer/subscription
increments billing_generation after verified handoff; old-generation webhooks
cannot change current wallet. Payment/grace timing and owner-transfer behavior
need a concrete transition contract before paid activation, not DDL guesswork.

Removed actor's in-flight result remains workspace data but is not accessible
to that removed actor. Current authorized members can obtain durable result under
existing content permissions. Workspace deletion must archive/retain financial
history first; FK restriction is intentional. Auth-account deletion needs a
separate retention/anonymization policy; never cascade financial rows.

## Reserve, dispatch and idempotency

1. Derive verified membership and action, canonical payload hash, workspace and
   policy version. Idempotency key persists through client transport retries.
   Same workspace/key but different actor/hash returns conflict; do not expose
   someone else's result. A legitimately shared job uses separately authorized
   job access, not guessed keys.
2. Fixed lock order: membership row for the actor (for admission), workspace
   wallet, relevant period rows in stable key order, then operation. Membership
   removal, billing transfer/reset and cancellation paths must follow compatible
   ordering. Worker uses wallet → period → operation (no actor admission).
3. Under wallet lock, recheck key before creating a new operation; atomically
   reserve from current unexpired authorized period and insert the ledger.
   Insufficient balance or membership failure performs no provider dispatch.
   Workspaces A/B have independent locks, period grants and keys.
4. One logical call_id is generated server-side and persists forever; attempts
   have separate telemetry IDs. Claim dispatch once from not_started and commit
   before provider I/O. Duplicates return pending/result, never another invocation.
5. Crash after claim is ambiguous, not evidence of provider failure. Mark unknown
   and reconcile using provider job/request IDs where supported. SDK retries need
   explicit auditing/limits; no local ledger can promise provider exactly-once
   without supported provider idempotency/recovery.
6. Durable result save precedes credit commit. Same-period success commits
   reserved credits; no additional subtraction. Save failure refunds even if
   supplier incurred cost. Output storage is idempotent by call_id.
7. Reset, refund and finalize all serialize on the same workspace wallet.
   Tombstones are retained; new client UUID per retry is not compliant.

## Subtitle duration and pricing

Never accept client seconds, billable minutes or amount. Server probes immutable,
authorized uploaded media or uses trusted provider metadata; bind duration to
stored object version/SHA-256. Verify ownership, MIME/actual decode, byte/length
bounds, URL allowlist and SSRF protection before fetching. Unverifiable,
zero/negative/NaN duration rejects or defers **before** reserve/provider dispatch.
Do not use last spoken timestamp, extension filename, or untrusted Content-Length
as duration. Metadata preflight needs its own abuse/size/concurrency limits.

Examples: 0.1/59.999/60 seconds → 3; 60.001/120 → 6; 120.001 → 9.
Precision/rounding policy must preserve verified milliseconds, not round down.
One subtitle logical action encompasses transcribe + refine; internal retries
and polling never charge again. A distinct user-requested regeneration is priced
and explicitly submitted as a new operation. Existing text-only SRT route lacks
media duration: do not retrofit a guessed minute; product must route it through
the composite contract or decide its separate pricing.

## Refund worker, races and late results

unknown_since is written once at first ambiguity, refund_due_at exactly +15min;
repeated polling/worker retries must not postpone it. Server time only.
Confirmed failure/cancellation refunds once. Provider costs are separate records
and can remain payable after refund. Abort provider when supported.

Refund worker takes wallet → reserved/current period (stable order) → operation,
checks reserved state and due time, atomically records full reversal, and restores
credits only if that original period is still current and unexpired. Otherwise
refund_expired = amount and current-period balance is unchanged. Never increase
a new period or archived period available balance. Duplicate workers no-op.

Result-save/finalize uses the same locks:
- Durable success before deadline commits once; later refund worker no-ops.
- Unknown success only finalized at/after due time refunds first even if the
  worker was delayed, then records succeeded/result_reference without committing
  or deducting again. Persist result independently; it is delivered.
- If refund worker wins first, late success keeps refunded credit_status and
  adds saved result. If success wins before deadline, it commits and refund no-ops.
- Unknown rows already refunded still reconcile for late output; refunding does
  not stop job recovery or discard results. Worker interval and retention/alerting
  are engineering gates, not permission to silently drop output.
- Explicit cancellation is different from timeout: remain cancelled, no re-debit;
  any recoverable output may be offered without restarting a cancelled task.
- Delivery uses an idempotent result/poll reference, scoped to current membership;
  no exactly-once push-notification claim. Removed users cannot receive private output.

A new key after unresolved refund is a new explicit user operation; no silent
resubmission. Both original late output and new output may exist, not double
billing of the original. Financial history and supplier telemetry remain separate.

## Period reset and webhook synchronization — design only

Free boundaries: calendar first 00:00 Asia/Hong_Kong; server-generated stable key.
Paid boundaries: verified canonical invoice/subscription period and workspace
billing_generation, never browser date/payer-wide latest active subscription.
Same period/invoice never refills, old period/generation never moves pointer
backward. Strictly newer verified period creates one new snapshot then moves
pointer atomically. Old reservations retain FK to their old period; late success
never subtracts new-period balance. No carry at reset.

Stripe signature and event-ID inbox are necessary but existing handler is not
sufficient: failed/stale replay claims and grants are not one atomic transaction,
and legacy invoice handler grants user credits without workspace/generation.
Replacement grant transactions and durable webhook dedupe/CAS require separate
implementation/approval. Don't globally disable webhook: existing subscriptions
and product order/refund/dispute fulfillment must remain operational. Keep legacy
800/2500 grants isolated; never silently reinterpret as new 150 workspace grant.
No customer/subscription/price/webhook setting was modified.

## Release gates and test plan

- Approve this replacement DDL/rollback; no need to reconfirm the rules above.
- Approve billing roles/handoff/grace/proration details before paid activation.
- Implement atomic replacement RPCs, metadata verifier, refund/recovery worker,
  workspace billing mapping and webhook generation guards, then test in an
  isolated DB. SQL has not executed; static text checks do not prove atomicity.
- Concurrency cases: 20 same-key requests → one reserve/claim; changed hash/actor
  conflicts; same key in A/B independent; unique invoice across workspaces;
  cross-workspace period FK rejection; shared payer A/B isolation; balance floor.
- Role cases: anon/member-nonmember/spoofed workspace/removed member; service-role
  only table/RPC grants; owner billing vs admin/member; payer not member; removal
  vs dispatch; transfer vs invoice; old generation event vs new subscription.
- Lifecycle: duplicate failure/refund/cancel; save failure; provider crash; unknown
  timeout at 14:59/15:00; refund worker reentry; both late-success race orders;
  delayed worker but result after deadline; late result delivery with no recharge.
- Period: Asia/HK month boundary, duplicate/out-of-order webhook, no rollover,
  cross-period reversal no new balance, reset/finalize/refund concurrency.
- Media: 0.1/59.999/60/60.001/120/120.001; spoofed client seconds; replaced object;
  NaN/zero/corrupt media; SSRF; huge upload; transcribe/refine retries billed once.
- Rollback: refuses any wallet/period/operation row. After usage revert runtime
  only; preserve financial data. Never execute old draft as an upgrade.
- Verify Web/App policy and states, real authenticated 429/503 and provider-zero
  negative tests. No paid benchmark. UI acceptance is Tommy's.

Free Beta may precede this paid wallet only if it does not write/grant/reserve
real credits and covers all cost-bearing routes with durable abuse controls.
See credits-beta-release-readiness.md. No production deployment, App release build,
phone install or device verification was performed for this design revision.
