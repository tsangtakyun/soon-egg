# EGG wallet/trial approval manifest

Approval update: Tommy confirmed the trial policy and this exact 230000 proposal
bundle in Master Chief turn 01a1184c-51dd-7982-8cb5-c3c5e5bb6359. The permitted
next apply is limited to an independently verified EGG staging target. Read-only
dashboard inspection found only the production EGG project and no branches in
the visible SOON organization. Remote apply remains NOT APPLIED. No additional
UI/policy confirmation is needed. See credits-staging-target-evidence.md.
Hashes below were rechecked after confirmation and match the approved files.

2026-10-07. Proposal and local schema tests only. Remote apply status: NOT APPLIED.
The accepted live Preview still uses code 1dd7806; this documentation/test bundle
does not redeploy or activate a trial. Complete decision brief: credits-trial-approval.md.

| File | SHA-256 |
| --- | --- |
| migrations/20261007230000_egg_workspace_trial_proposal.sql | 95f031619631802630c86f17f7c8169cf05e87853d5342239a5828641d04011f |
| migrations/20261007230000_egg_workspace_trial_proposal.rollback.sql | 4044a1385df6b870d0562f32db3f846a81b73cf7b1cae0ad7f86849f8ebcf974 |
| credits-trial-latest.diff | 10b4e5d7df4881cae4e64b042ff6823d90c21c2e121caea4cd3aa2aa6c7e4088 |
| ../tests/credits-trial-schema.cjs | 9a30c5d249a2950644cffb2e8660d28cfddcca3a43e41dc58f1475bcecdea76b |

Baseline of exact diff: existing 20261007180000 workspace proposal at repository
commit 195ee27. New 230000 file is a complete replacement CREATE script for absent
tables; do not apply both versions. Future remote target must be identified and
approved separately; no production target is implied.

Local test dependency: @electric-sql/pglite 0.5.8, installed with --ignore-scripts
in /tmp/egg-wallet-schema-review.e3tQv4. It was not added to product dependencies.
Run from the Web repository:

```sh
NODE_PATH=/tmp/egg-wallet-schema-review.e3tQv4/node_modules node tests/credits-trial-schema.cjs
```

Result: PASS, 33 checks. In-memory PostgreSQL executes real DDL/constraint/privilege
and rollback checks against minimal local auth/workspace fixtures. No remote DB,
provider or payment call. This is not Supabase environment, RPC or concurrency
verification. Each test closes its in-memory database after completion.

The policy and exact bundle have now been accepted as described above. A verified
independent staging target is still missing; production is outside that approval.
Further runtime/RPC implementation must be reviewed before activation.
