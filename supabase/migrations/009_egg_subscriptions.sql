CREATE TABLE IF NOT EXISTS egg_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  plan text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS egg_subscriptions_user_status_idx
ON egg_subscriptions (user_id, status);
