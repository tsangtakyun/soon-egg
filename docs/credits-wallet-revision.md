# Wallet replacement approval diff — 2026-10-07

Baseline: 7db96654e3174c5c24093f2087cf6e2352bbb8f5, the un-applied 160000 user-wallet proposal.
Exact unified comparison: [credits-wallet-latest.diff](credits-wallet-latest.diff).
This is replacement CREATE DDL for absent tables, not an ALTER migration of a deployed schema.
Do not apply either old proposal first. If tables already exist, STOP for collision/upgrade review.

| Previous draft | Latest confirmed replacement |
| --- | --- |
| Wallet PK user_id/Master | workspace_id FK EGG creator profile; separate payer_user_id |
| Current period overwritten in wallet | Three tables: wallet pointer + unique workspace/period snapshots + operations |
| User/key idempotency | workspace/key uniqueness, global call_id, actor snapshot, composite period FK |
| Only conversation1/script3/EggThis5 | short reply1/full reply3/image reply5/subtitle3 × ceil verified minutes |
| Proposed Hong Kong timezone | Confirmed Asia/Hong_Kong monthly first |
| Proposed unknown deadline | Confirmed15min refund, no redispatch; late output delivered free |
| Proposed cross-period interpretation | Confirmed reversal only, no new-period balance increase |
| No metadata pricing fields | Immutable media hash, trusted-duration source, generated billable_minutes |
| Payer-based grant lookup | Workspace subscription/generation/invoice identity; cross-workspace grant uniqueness |
| Two-table unused rollback | Three-table unused rollback, refuses any persisted records |

Additional period table, owner-only billing/handoff details, test execution and
DDL apply are engineering approval gates. Latest confirmed prices/timezone/
refund/wallet ownership need no repeated confirmation. Existing paid subscription
transition/proration and seven-day trial vs permanent free relationship are not
invented here.

Test plan is in credits-wallet-approval-design.md. Static checks can check schema
shape; no SQL has been executed and no atomicity has been proven. App release,
device and Stripe behavior remain untested. No production/deploy action in this revision.
