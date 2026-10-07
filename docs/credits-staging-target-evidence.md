# EGG staging target verification — 2026-10-07

Outcome: no existing independent EGG staging target was identified in the visible
SOON organization. No remote SQL was executed and no resource was created.

## Authorization record

- Source thread: Master Chief, 01a0b4df-9d0a-7093-97ec-2a671ac5ffe9.
- Human confirmation turn: 01a1184c-51dd-7982-8cb5-c3c5e5bb6359, text「確認！」,
  directly following the EGG approval brief.
- Accepted policy: owner explicitly starts 7-day/30-credit shared workspace trial;
  once per owner/workspace; expiry retains read/edit/download, no automatic charge
  or free monthly conversion; existing free30 retained without extra trial;
  upgrade150 does not combine trial remainder.
- DDL scope: exact 230000 proposal and paired rollback hashes in manifest,
  independently verified EGG staging only. No production, new paid resources,
  Stripe, RPC/activation or App release authorization implied.

## Read-only dashboard evidence

Opened the existing authenticated Supabase dashboard through Chrome. No CLI
Keychain access, key reveal, credential extraction or new connector was used.

Organization: SOON (Pro), `etqgsxpjecobbjqgmwle`.
Observed page: https://supabase.com/dashboard/org/etqgsxpjecobbjqgmwle

The unfiltered project list contained:

| Name | Project ref | Relevance |
| --- | --- | --- |
| SOON-beauty | jryjynpzuxrfteglbiwh | Different product, not an approved EGG target |
| soon-campaign-workspace | wmpipimxqsnjwztuijbp | Different product, not an approved EGG target |
| SOON - core | fqnnjwxxwxggreoognkv | Different product, not an approved EGG target |
| soon-egg | ycqribpphvywibamtjew | Explicit main / Production; excluded |

EGG detail: https://supabase.com/dashboard/project/ycqribpphvywibamtjew

- Header: soon-egg → main → Production.
- Project URL: https://auth.egg.sooncreator.network.
- Recent branch: No branches.
- Status: Healthy; micro / primary database, ap-southeast-1.
- Latest migration shown: reply_quotation_assistant.
- Existing Advisor card showed Security Definer View for public.brand_perks_public.
  This is a pre-existing production observation, not a result of the trial DDL;
  no remediation or security settings change was attempted.

These observations establish that this EGG project is not the authorized staging
target. They do not prove that no staging exists in any other organization.
No branch/project creation button was used. No paid resource was provisioned.

## Gates and test evidence

| Check | Status |
| --- | --- |
| Confirmed 230000 SQL/rollback/diff/test hashes | Match approved manifest |
| Local PostgreSQL DDL/constraint/grant/rollback checks | Previously passed 33 on PGlite 0.5.8; no new claim of Supabase execution |
| Remote staging project ID and independent database | NOT FOUND / NOT VERIFIED |
| Staging auth.users / egg_creator_profiles dependencies and table absence | NOT TESTED: no target |
| Staging triggers, external integrations, network side effects and costs | NOT TESTED: no target |
| Staging SQL apply / grants / Advisor / real SQL cases | NOT RUN: no target |
| Production SQL mutation / paid resources / provider calls | NONE |
| Web code/deployment and App code | Unchanged from accepted Preview evidence |
| App release/build/install/device | NOT DONE |

Next input needed is an existing dedicated EGG staging project link/ref, if one
exists outside this visible list. If none exists, choosing/provisioning an isolated
environment and any associated cost is a separate decision; do not repurpose
production or another product's database. Once a target is identified, verify
isolation/dependencies/side effects read-only before the tool's applicable
action-time confirmation and exact approved DDL apply. RPCs and activation remain
a later separately reviewable diff.
