-- Run after 003
-- psql -U postgres -d payment_gateway -f src/db/004_create_webhook_deliveries.sql

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id         UUID         NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  payment_intent_id   UUID         NOT NULL REFERENCES payment_intents(id) ON DELETE CASCADE,
  event_type          VARCHAR(50)  NOT NULL,  -- 'payment.succeeded', 'payment.failed', 'refund.succeeded'
  url                 VARCHAR(500) NOT NULL,  -- the merchant's webhookUrl at time of delivery
  request_payload     JSONB        NOT NULL,  -- exactly what we sent in the POST body
  response_status     INTEGER      NULL,      -- HTTP status we got back (null if timed out)
  response_body       TEXT         NULL,      -- raw response text from merchant server
  attempt_number      INTEGER      NOT NULL DEFAULT 1,
  status              VARCHAR(20)  NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending', 'delivered', 'failed')),
  delivered_at        TIMESTAMPTZ  NULL,      -- when delivery was confirmed (status = delivered)
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wd_merchant_id       ON webhook_deliveries (merchant_id);
CREATE INDEX IF NOT EXISTS idx_wd_payment_intent_id ON webhook_deliveries (payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_wd_status            ON webhook_deliveries (status);
CREATE INDEX IF NOT EXISTS idx_wd_created_at        ON webhook_deliveries (created_at);
