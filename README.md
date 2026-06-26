# 💰 Payment Gateway

A full-stack payment gateway built from scratch to understand how systems like Razorpay and Stripe actually work under the hood — merchant auth, payment intents, idempotency, refunds, webhooks, and an audit-logged event timeline.

Built as a learning project with **raw SQL** (no ORM) to understand Postgres directly, plus a complete React dashboard for merchants to manage their account.

---

## 🏗️ Tech Stack

**Backend**
- Node.js + Express
- PostgreSQL — raw SQL with the `pg` driver (no ORM)
- Redis — idempotency caching
- BullMQ — background job queue for webhook delivery
- JWT — merchant dashboard auth
- bcrypt — password & API key hashing

**Frontend**
- React 19 + Vite
- Tailwind CSS + DaisyUI
- React Router
- Recharts — dashboard analytics
- Axios

---

## 📐 Architecture

```mermaid
flowchart TD
    Customer(Customer) -->|pays| Checkout[Checkout Page]

    subgraph Merchant["Merchant Side - separate server"]
        Checkout --> MerchBackend[Merchant Backend]
    end

    MerchBackend -->|API key plus Merchant ID| AuthMW[Auth Middleware]

    subgraph Gateway["Payment Gateway - this repo"]
        AuthMW --> PaymentSvc[Payment Service]
        PaymentSvc --> RedisCache[Redis Idempotency Cache]
        PaymentSvc --> Processor[Mock Processor]
        PaymentSvc --> Postgres[PostgreSQL Database]
        Processor --> EventLog[Event Log Audit Trail]
        Processor --> Queue[BullMQ Queue]
        Queue --> Worker[Webhook Worker]
        Dashboard[Merchant Dashboard] -.-> Postgres
    end

    Worker -->|signed webhook| MerchBackend

    subgraph Banking["Where a real bank plugs in"]
        RealProcessor[Razorpay or Stripe] --> Network[Card Network]
        Network --> Issuing[Issuing Bank]
        Issuing --> Acquiring[Acquiring Bank]
        Acquiring --> Settlement[Settlement]
    end

    Processor -.->|replaced by| RealProcessor

    style Merchant fill:#EEEDFE,stroke:#534AB7,color:#26215C
    style Gateway fill:#E1F5EE,stroke:#0F6E56,color:#04342C
    style Banking fill:#F1EFE8,stroke:#5F5E5A,color:#2C2C2A
    style Processor fill:#FAEEDA,stroke:#854F0B,color:#412402
```

The diagram shows the full system: the customer paying, the merchant's separate server (frontend + backend) calling the gateway with an API key, the gateway itself (auth, payment service, Redis idempotency cache, Postgres, mock processor, audit log), the BullMQ queue + worker delivering webhooks back to the merchant, and — at the bottom — where a real bank, card network, and processor would plug in to replace the mock.

Two separate auth mechanisms exist for two separate audiences:

| Auth type | Used by | Routes |
|---|---|---|
| **JWT** | Merchant logging into the dashboard | `/merchants/me/*` |
| **API Key** | Merchant's own server integrating payments | `/payment-intents/*`, `/transactions/*` |

---

## ✨ Features

- **Merchant accounts** — register, login, rotate API keys, manage profile
- **Payment Intents** — create, confirm, cancel, list (with filters + pagination), get detail
- **Idempotency** — safe retries via `idempotencyKey`, cached in Redis, backed by a Postgres unique constraint
- **Mock processor** — simulates real-world card decline rates (~80% success / ~20% failure)
- **Refunds** — full or partial, with balance tracking to prevent over-refunding
- **Audit trail** — every status change is logged as an immutable event, queryable as a timeline
- **Webhooks** — async delivery to the merchant's server on payment success/failure, with HMAC signing and automatic retries (exponential backoff)
- **Dashboard** — stats, charts, transaction history, webhook delivery logs, settings

---

## 📂 Project Structure

```
payment-gateway/
├── backend/
│   ├── server.js                  # Entry point
│   ├── workers/
│   │   └── webhookWorker.js       # Separate process — delivers webhooks
│   ├── test-webhook-server.js     # Throwaway server for local webhook testing
│   └── src/
│       ├── config/
│       │   ├── db.js              # pg Pool
│       │   └── redis.js           # ioredis client
│       ├── db/                    # Raw .sql migration files, run in order
│       │   ├── 001_create_merchants.sql
│       │   ├── 002_create_payment_intents_and_transactions.sql
│       │   ├── 003_create_refunds_and_transaction_events.sql
│       │   └── 004_create_webhook_deliveries.sql
│       ├── services/               # All business logic — no HTTP knowledge
│       │   ├── authService.js
│       │   ├── merchantService.js
│       │   ├── paymentService.js
│       │   ├── refundService.js
│       │   ├── processorService.js # Mock payment processor
│       │   └── webhookService.js
│       ├── controllers/            # Thin HTTP layer — req/res only
│       ├── routes/
│       ├── middleware/
│       │   ├── auth.js             # protectJWT + protectApiKey
│       │   └── errorHandler.js
│       └── utils/
│           └── webhookQueue.js     # BullMQ queue (producer)
│
└── frontend/
    └── src/
        ├── api/client.js           # Axios instance + all API calls
        ├── context/AuthContext.jsx
        ├── components/
        └── pages/
            ├── Login.jsx / Register.jsx
            ├── Dashboard.jsx       # Stats + chart
            ├── Transactions.jsx    # List + filters
            ├── TransactionDetail.jsx # Intent + event timeline
            ├── Webhooks.jsx        # Delivery logs
            └── Settings.jsx        # Profile, webhook URL, key rotation
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL running locally or hosted
- Redis running locally or hosted (e.g. Redis Cloud, Upstash)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd payment-gateway

cd backend && npm install
cd ../frontend && npm install
```

### 2. Set up the database

```bash
psql -U postgres -c "CREATE DATABASE payment_gateway;"

cd backend
psql -U postgres -d payment_gateway -f src/db/001_create_merchants.sql
psql -U postgres -d payment_gateway -f src/db/002_create_payment_intents_and_transactions.sql
psql -U postgres -d payment_gateway -f src/db/003_create_refunds_and_transaction_events.sql
psql -U postgres -d payment_gateway -f src/db/004_create_webhook_deliveries.sql
```

### 3. Configure environment variables

**`backend/.env`**
```env
PORT=5000
DATABASE_URL=postgres://postgres:yourpassword@localhost:5432/payment_gateway
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_jwt_key
WEBHOOK_SECRET=your_webhook_signing_secret
NODE_ENV=development
```

> If using a hosted Redis (Redis Cloud, Upstash) with TLS, use `rediss://` instead of `redis://` in the URL — the app detects this automatically.

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:5000
```

### 4. Run it — 3 terminals

```bash
# Terminal 1 — API server
cd backend
npm run dev

# Terminal 2 — webhook worker (background job processor)
cd backend
npm run worker:dev

# Terminal 3 — frontend
cd frontend
npm run dev
```

Dashboard: `http://localhost:5173`
API: `http://localhost:5000`

### 5. (Optional) Test webhooks locally

```bash
cd backend
node test-webhook-server.js
```
Then set your merchant's webhook URL to `http://localhost:3001/webhook` from Settings, and confirm a payment to see it fire.

---

## 📡 API Reference

### Auth — public
```
POST /auth/register   { name, email, password }
POST /auth/login      { email, password }
```

### Merchant Dashboard — JWT (`Authorization: Bearer <token>`)
```
GET   /merchants/me
PATCH /merchants/me                       { name?, webhookUrl? }
POST  /merchants/me/rotate-key
GET   /merchants/me/stats
GET   /merchants/me/payment-intents       ?status&from_date&to_date&page&limit
GET   /merchants/me/payment-intents/:id
GET   /merchants/me/transactions/:id
GET   /merchants/me/webhooks              ?status&page&limit
```

### Payments — API Key (`Authorization: Bearer <apiKey>` + `X-Merchant-ID: <id>`)
```
POST /payment-intents                 { amount, currency, idempotencyKey, metadata? }
GET  /payment-intents                 ?status&from_date&to_date&page&limit
GET  /payment-intents/:id
POST /payment-intents/:id/confirm     { paymentMethodId? }
POST /payment-intents/:id/cancel
```

### Transactions & Refunds — API Key
```
GET  /transactions/:id
GET  /transactions/:id/refunds
GET  /transactions/:id/events
POST /transactions/:id/refund         { amount, reason }
```

`reason` must be one of: `requested_by_customer`, `duplicate`, `fraudulent`

---

## 🔑 Key Design Decisions

**Money is always an integer.** Amounts are stored in paise/cents (`10000` = ₹100.00), never as floats — avoiding classic floating-point rounding bugs.

**Idempotency is enforced at two layers.** Redis caches recent responses for fast retries; a Postgres `UNIQUE (merchant_id, idempotency_key)` constraint guarantees correctness even if the cache expires or is unavailable.

**A payment intent is a single attempt, not a retryable object.** Once an intent reaches `succeeded`, `failed`, or `cancelled`, it's locked forever — a state machine guard rejects any further confirm attempts. Retrying a failed payment means creating a brand new intent with a new idempotency key, mirroring how Stripe and Razorpay behave.

**Webhooks are asynchronous and queued, not sent inline.** A payment confirmation enqueues a BullMQ job rather than making the HTTP call directly — so a slow or unreachable merchant server never blocks the payment response, and failed deliveries automatically retry with exponential backoff.

**Every state change is logged immutably.** The `transaction_events` table is append-only — nothing is ever updated or deleted from it — giving a full audit trail of exactly what happened and when.

---

## 🧪 Manual Testing Checklist

- [ ] Register → confirm API key is shown once and never again
- [ ] Login → JWT works on `/merchants/me/*` routes
- [ ] Create intent with API key → `201`
- [ ] Repeat same `idempotencyKey` → `200`, identical response, no new DB row
- [ ] Confirm intent → ~80% succeed, ~20% fail (run it 10x to see the spread)
- [ ] Confirm an already-`succeeded` intent again → `409`
- [ ] Cancel a `created` intent → `200`; cancel it again → `409`
- [ ] Refund a succeeded transaction (partial, then the remainder) → both `201`
- [ ] Attempt to over-refund → `422`
- [ ] Set a webhook URL → confirm a payment → delivery appears in `/merchants/me/webhooks`
- [ ] Stop the test webhook server → confirm a payment → see retry attempts in the worker logs

---

## 📈 Roadmap / Known Gaps

- No scheduled cleanup job for expired, never-confirmed intents (they remain `status: 'created'` indefinitely)
- Mock processor only — no real Razorpay/Stripe integration
- No rate limiting on public auth routes
- Webhook signing secret is shared across all merchants rather than per-merchant

---

## 📝 License

Built for learning purposes.
