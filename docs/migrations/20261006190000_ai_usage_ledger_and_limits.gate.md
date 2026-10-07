# AI usage ledger production gate

Project: `soon-egg` (`ycqribpphvywibamtjew`)

## Exact field mapping

| Contract field | Database field | Notes |
| --- | --- | --- |
| provider | `provider` | Provider slug; no credential data. |
| model | `model` | Actual response model only; `NULL` before/without provider response. |
| input_tokens | `input_tokens` | Provider usage. |
| output_tokens | `output_tokens` | Provider usage. |
| cache_read_tokens | `cache_read_tokens` | Anthropic `cache_read_input_tokens`. |
| cache_write_tokens | `cache_write_tokens` | Anthropic `cache_creation_input_tokens`. |
| image_spec | `image_spec` | JSON object with count/bytes/MIME/dimensions only; never image content. |
| audio_seconds | `audio_seconds` | Duration only. |
| workspace_id | `workspace_id` | Existing creator workspace FK. |
| call_id | `call_id` | Unique internal UUID for a provider attempt. |
| provider_request_id | `provider_request_id` | Provider request/message ID when returned. |
| status | `status` | `started`, `succeeded`, `failed`, or `cancelled`. |
| attempt | `attempt` | One row per attempt. |
| est_cost_hkd | `est_cost_hkd` | Token plus web-search estimate at versioned fixed budget FX. |
| actual_cost_hkd | `actual_cost_hkd` | Provider-confirmed actual only; otherwise `NULL`. |
| price_version | `price_version` | Model prices and fixed budget FX version. |

Additional fields: `feature`, `operation`, `user_id`, `requested_model`,
`max_attempts_configured`, `web_search_requests`,
`web_search_est_cost_hkd`, `actual_cost_source`, sanitized `error_code`,
benchmark batch/action/run markers, and timestamps. No prompt, response,
generated content, raw image/audio, or sensitive error text is stored.

## Pre-apply collision check

Checked in the production SQL Editor before apply:

```json
{"rate_table":null,"usage_table":null,"feature_index":null,"workspace_index":null,"limiter_function":null,"same_name_functions":0}
```

## Security Advisor baseline

Captured before apply:

- Errors: 1
  - Security Definer View — `public.brand_perks_public`
- Warnings: 4
  - Function Search Path Mutable — `public.egg_update_updated_at`
  - RLS Policy Always True — `public.egg_cart_items`
  - Signed-In Users Can Execute SECURITY DEFINER Function — `public.set_egg_mediakit_public(uuid, boolean)`
  - Leaked Password Protection Disabled — Auth
- Info: 33

These are pre-existing and outside this migration's scope. Post-apply counts and
entities must match with no new warning/error attributable to the migration.

## Rollback

See `20261006190000_ai_usage_ledger_and_limits.rollback.sql`. It drops only the
two new tables, two new indexes, and one new function. It intentionally does not
use `CASCADE`.

## Apply and post-apply verification

- Applied in one explicit transaction in the production SQL Editor: success.
- Both new tables have RLS enabled.
- `anon`: usage select/insert, rate-table select, and limiter execute are all denied.
- `authenticated`: usage select/insert, rate-table select, and limiter execute are all denied.
- `service_role`: usage select/insert, rate-table select, and limiter execute are allowed.
- A real `service_role` usage-event insert succeeded inside a transaction that was
  immediately rolled back; no probe row remains.
- Security Advisor rerun after apply:
  - Errors: 1 (same existing entity as baseline)
  - Warnings: 4 (same four existing entities as baseline)
  - Info: 35. The two added suggestions are `RLS Enabled No Policy` for
    `public.egg_ai_usage_events` and `public.egg_ai_rate_limit_counters`.
- No new Security Advisor error or warning was introduced.

The denial checks were also executed under real `SET LOCAL ROLE` transactions.
For both `anon` and `authenticated`, usage SELECT, usage INSERT, counter SELECT,
counter INSERT, and limiter RPC EXECUTE each returned SQLSTATE `42501`
(`insufficient_privilege`). Every transaction was rolled back.

The applied production table was initially created with `model NOT NULL`. The
correct contract requires actual-provider model semantics, so local code and the
source migration use nullable `model`, keep the requested value in
`requested_model`, and write `model = NULL` for started/failed calls with no
provider response.

The separately approved corrective migration
`20261007103000_ai_usage_events_model_nullable.sql` was applied in one explicit
production transaction. Post-correction verification confirmed:

- `model` and `requested_model` are both nullable.
- Both usage tables still have RLS enabled.
- A `service_role` insert with `model = NULL` and a non-null `requested_model`
  succeeded inside a transaction that was immediately rolled back.
- For both `anon` and `authenticated`, usage SELECT, usage INSERT, counter
  SELECT, counter INSERT, and limiter RPC EXECUTE still each return SQLSTATE
  `42501` under real `SET LOCAL ROLE` transactions.
- Security Advisor remains at 1 existing error, 4 existing warnings, and 35
  info suggestions. No new error or warning was introduced by the correction.
