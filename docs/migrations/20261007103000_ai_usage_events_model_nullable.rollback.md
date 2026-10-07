# Rollback note: nullable actual model

This corrective migration intentionally has no automatic rollback SQL.

Once a provider attempt can be recorded without a provider response, `model`
may legitimately contain `NULL`. A blind `SET NOT NULL` would fail or encourage
backfilling `requested_model` as though it were the actual provider response
model, which would corrupt the cost ledger semantics.

If this change ever needs to be reversed, first prove that every row has a
provider-confirmed actual model from an independent source. Do not copy
`requested_model` into `model`. Any future constraint change requires a separate
reviewed migration and explicit production approval.
