-- Run this file once to create the merchants table
-- psql -U postgres -d payment_gateway -f src/db/001_create_merchants.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS merchants (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255)  NOT NULL,
  email       VARCHAR(255)  NOT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,
  api_key_hash VARCHAR(255) NOT NULL,
  webhook_url VARCHAR(500)  NULL,
  status      VARCHAR(20)   NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merchants_email  ON merchants (email);
CREATE INDEX IF NOT EXISTS idx_merchants_status ON merchants (status);
