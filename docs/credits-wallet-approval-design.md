# Minimal wallet approval design — not implemented or applied

## Confirmed policy and pending decisions

Free: 30/month, reset on the first, no accumulation. Creator: HK$98/month,
150 credits per paid subscription cycle, no accumulation. Actions: conversation
1, script 3, EggThis 5. Other actions remain unpriced and disabled for charging.
Asia/Hong_Kong is a proposed free reset timezone, **not confirmed**.

Two draft tables contain only included monthly credits and logical operations.
No purchased-credit migration, Stripe configuration change, or alteration to
legacy balances. The billing account is the authenticated paying user, not the
selected workspace owner. Workspace membership authorization remains mandatory.
Any alternative shared-team wallet needs a separate approved policy.

DDL: `migrations/20261007160000_egg_wallet_minimal_proposal.sql`.
Rollback: matching `.rollback.sql`. Neither has been executed. The prior
121000 draft and the disabled current RPC implementation must not be enabled.
This DDL intentionally has **no mutation RPC**: server transactions implementing
the protocol below and concurrency tests are a required subsequent delivery.

## Transaction and idempotency protocol

1. Authenticate and authorize the workspace. Server determines action/cost;
   never trust a client amount, entitlement, user ID or subscription period.
2. Client retains one Idempotency-Key across retries of the same submission.
   Hash canonical action, workspace, input, model configuration and policy
   version; store SHA-256 only, not raw prompt/image data in the ledger.
3. Lock the user's wallet first, then look up/lock the operation. All reserve,
   finalize, refund and reset paths use this same lock order. Matching key/hash
   returns existing state/result; changed hash returns 409. This check must
   occur under the wallet lock, including on concurrent first submissions.
4. New request atomically checks balance, subtracts amount and inserts operation.
   Server UUID `call_id` is stable for its lifetime. Insufficient balance creates
   no operation/provider call. Do not delete completed idempotency tombstones.
5. Atomically claim dispatch only from `not_started`, assign `dispatch_claim`,
   commit transaction, then invoke provider outside the DB transaction. Duplicate
   callers receive pending state and cannot dispatch. A crash after claiming is
   ambiguous: reconciliation, **not automatic redispatch**.
6. Persist generated output durably, then atomically mark succeeded/committed
   with result reference. Delivery retries return that result without calling
   provider. Save failure refunds credits even if supplier incurred cost.

One logical call may have separately recorded attempt IDs in usage telemetry.
Supplier token/cost records remain append-only and survive credit refunds.
Provider SDK retries need auditing/explicit limits: local dispatch claims alone
cannot guarantee exactly-once execution at a provider without its own supported
idempotency or recoverable job ID. Never claim that guarantee.

## Failure, cancellation, timeout and late results

Confirmed failure or cancellation atomically refunds once, marks terminal credit
state and retains key. Abort provider where supported. Cancel request can refund
even if provider cannot stop; late success never deducts again or uncancels it.

A transport timeout does not prove provider failure. Mark `unknown`, return a
pending operation reference, and reconcile by provider job/result identifier
where available. No new provider attempt on the same key. Proposed unresolved
deadline: 15 minutes, after which automatically refund and retain the blocked
tombstone; this deadline requires approval. Late successful output after refund
does not recharge. A new user submission with a new key is a separate explicit
operation, not a silent retry. Polling and reconciliation never consume credits.

Same-period refund restores original amount under wallet lock, capped at that
period's allowance. Unexpected cap conflict must be logged/alerted. Cross-period
refund records the original credit reversal as `refund_expired`, without adding
it to the new period, preserving no-rollover. **This expiry interpretation needs
approval**; UI must say the old-period credit was reversed but has expired, not
promise spendable credits. If approved instead as compensation, model it in a
separate adjustment ledger, not silently carry monthly credits forward.

## Reset and Stripe period synchronization — design only

Free period boundaries are computed server-side using the approved timezone.
Paid period boundaries come from verified Stripe subscription/invoice state,
not browser dates or checkout redirects. Verify signature and canonical customer
mapping; consume events through the existing canonical webhook inbox/deduplication
transaction. If that inbox cannot support atomic dedupe, approve a separate inbox
migration before implementation; these two tables alone do not solve event dedupe.

Same period never regrants allowance. Older/out-of-order period events cannot
move the wallet backward or refill it. New paid grant requires verified paid
entitlement and a strictly newer authoritative period; period corrections,
plan transitions, payment failure/grace and cancellation need explicit handling,
not a generic 'bounds changed => reset'. At reset replace available with current
allowance; old reservations retain their period snapshot. Late commit does not
subtract new-period credits. Late refund follows the expiry policy above.
No subscription creation, price change, payment or webhook setting was performed.

## Release gates and acceptance

- Approve timezone, unresolved timeout deadline and cross-period refund policy.
- Review/apply DDL only with separate authorization; implement replacement RPCs,
  authorization, billing inbox synchronization and reconciliation worker.
- Test concurrent duplicate reserve (one debit/one dispatch), hash conflict,
  insufficient balance, save failure, duplicate refund, cancel/late success,
  unknown timeout, duplicate/out-of-order webhook and period-boundary refund.
- Test actual authenticated rate limiting separately; mock guard tests are not
  live 429 or database atomicity evidence. No paid benchmark needed.
- Verify Web and App against the shared policy and actual wallet balance.
- Charging flag remains false until these gates pass. Production must show the
  actual disabled status or enable real charging after verification; removing
  the Preview notice alone is **not** charging activation.
- Stop charging/workers before rollback. If any records exist, preserve financial
  history and revert runtime only. Guarded schema rollback refuses nonempty tables.

UI acceptance is Tommy's. iOS release build, phone install and device acceptance
are separate gates; passing Web build does not certify any of them.
