-- Run this file once after 001
-- psql -U postgres -d payment_gateway -f src/db/002_create_payment_intents_and_transactions.sql

CREATE TABLE IF NOT EXISTS payment_intents (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id      UUID         NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  amount           INTEGER      NOT NULL CHECK (amount > 0),
  currency         CHAR(3)      NOT NULL,
  status           VARCHAR(20)  NOT NULL DEFAULT 'created'
                                CHECK (status IN ('created','processing','succeeded','failed','cancelled')),
  idempotency_key  VARCHAR(255) NOT NULL,
  metadata         JSONB        NULL,
  expires_at       TIMESTAMPTZ  NOT NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_merchant_idempotency UNIQUE (merchant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_pi_merchant_id ON payment_intents (merchant_id);
CREATE INDEX IF NOT EXISTS idx_pi_status      ON payment_intents (status);
CREATE INDEX IF NOT EXISTS idx_pi_created_at  ON payment_intents (created_at);

CREATE TABLE IF NOT EXISTS transactions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id UUID        NOT NULL REFERENCES payment_intents(id) ON DELETE CASCADE,
  merchant_id       UUID        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  amount            INTEGER     NOT NULL,
  currency          CHAR(3)     NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','processing','succeeded','failed')),
  gateway_ref       VARCHAR(255) NULL,
  gateway_response  JSONB        NULL,
  failure_code      VARCHAR(100) NULL,
  failure_message   VARCHAR(500) NULL,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_txn_payment_intent_id ON transactions (payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_txn_merchant_id       ON transactions (merchant_id);
CREATE INDEX IF NOT EXISTS idx_txn_status            ON transactions (status);
