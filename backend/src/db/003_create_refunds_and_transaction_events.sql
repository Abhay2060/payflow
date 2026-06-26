-- Run after 002
-- psql -U postgres -d payment_gateway -f src/db/003_create_refunds_and_transaction_events.sql

CREATE TABLE IF NOT EXISTS refunds (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID         NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  merchant_id    UUID         NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  amount         INTEGER      NOT NULL CHECK (amount > 0),
  reason         VARCHAR(100) NOT NULL CHECK (reason IN ('requested_by_customer', 'duplicate', 'fraudulent')),
  status         VARCHAR(20)  NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'processing', 'succeeded', 'failed')),
  gateway_ref    VARCHAR(255) NULL,
  gateway_response JSONB      NULL,
  failure_code   VARCHAR(100) NULL,
  failure_message VARCHAR(500) NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_transaction_id ON refunds (transaction_id);
CREATE INDEX IF NOT EXISTS idx_refunds_merchant_id    ON refunds (merchant_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status         ON refunds (status);

-- ── transaction_events ────────────────────────────────────────────────────────
-- Append-only audit log. Every state change on a transaction creates one row here.
-- Never UPDATE or DELETE from this table — ever.
CREATE TABLE IF NOT EXISTS transaction_events (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID         NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  event_type     VARCHAR(50)  NOT NULL,
  from_status    VARCHAR(20)  NULL,
  to_status      VARCHAR(20)  NULL,
  payload        JSONB        NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  -- No updated_at — events are immutable, they never get updated
);

CREATE INDEX IF NOT EXISTS idx_txn_events_transaction_id ON transaction_events (transaction_id);
CREATE INDEX IF NOT EXISTS idx_txn_events_created_at     ON transaction_events (created_at);
