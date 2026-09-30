
CREATE TABLE IF NOT EXISTS egg_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  email text NOT NULL,
  plan text NOT NULL, -- 'basic' | 'pro'
  status text DEFAULT 'active', -- 'active' | 'cancelled' | 'past_due'
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
;
