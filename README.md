# ChatApp

Production-grade 1-on-1 private messaging platform built on the PERN stack, Socket.io, and Redis. End-to-end encrypted, feature-based architecture, zero-trust auth, horizontally scalable.

- **Backend** — Node.js 20 · Express · Socket.io · Prisma · PostgreSQL · Redis · JWT · bcrypt · node-cron
- **Frontend** — React 19 · Vite · Tailwind · TanStack Query · Zustand · Socket.io-client · Web Crypto (AES-GCM)
- **Infra** — Docker Compose · Nginx (TLS + WS proxy) · GitHub Actions CI

---

## Highlights

- **1-on-1 chats only.** Deterministic room ids (`min(a,b)_max(a,b)`) prevent duplicates.
- **End-to-end encryption.** Sender encrypts with AES-GCM in the browser (Web Crypto); server stores ciphertext only.
- **Refresh-token rotation.** Single-use refresh tokens, hashed at rest, httpOnly Secure SameSite=Strict cookies. `tokenVersion` supports "log out everywhere".
- **Redis presence.** Multi-device presence with reference counting. Falls back to Postgres `lastSeenAt`.
- **Delivery pipeline.** `SENT → DELIVERED → READ` with per-message ack events across all sender devices.
- **Disappearing messages.** 5min / 1h / 1d / 1w expiry, cron sweep + realtime `message_deleted` broadcast.
- **Reactions, replies, edits, soft-deletes.** All go through the same service layer whether they arrive over REST or Socket.io.
- **PostgreSQL full-text search** (safe metadata-only index by default; plaintext preview opt-in per Phase 10).
- **Feature-based folder layout.** Strict layering — controllers/handlers → services → repositories → Prisma.

---

## Repository layout

```
ChatApp/
├── backend/            Node.js API + Socket.io server
├── frontend/           React 19 Vite SPA
├── nginx/              Edge TLS + reverse-proxy config
├── docs/               Architecture, Socket, API docs
├── docker-compose.yml
└── .github/workflows/  CI pipeline
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/SOCKET_EVENTS.md`](docs/SOCKET_EVENTS.md), [`docs/API.md`](docs/API.md).

---

## Local development

### Prerequisites

- Node.js ≥ 20.11
- Docker (for Postgres + Redis)

### 1. Start dependencies

```bash
docker compose up -d postgres redis
```

### 2. Backend

```bash
cd backend
cp .env.example .env             # then fill in secrets
npm install
npx prisma migrate deploy
npm run dev                      # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                      # http://localhost:5173
```

Vite proxies `/api` and `/socket.io` to `VITE_API_ORIGIN` so both dev servers work behind a single origin.

---

## Environment variables

### Backend (`backend/.env`)

| Var | Purpose |
|-----|---------|
| `NODE_ENV` | `development` / `test` / `production` |
| `PORT` | HTTP listen port (default 4000) |
| `API_PREFIX` | REST prefix (default `/api`) |
| `CORS_ORIGIN` | Comma-separated allowed origins |
| `COOKIE_DOMAIN` | Domain scoping for the refresh cookie |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` | ≥32 chars, HS256 |
| `JWT_REFRESH_SECRET` | ≥32 chars, HS256 |
| `JWT_ACCESS_TTL` | e.g. `15m` |
| `JWT_REFRESH_TTL` | e.g. `30d` |
| `BCRYPT_COST` | 10–15 (default 12) |
| `CLOUDINARY_*` | Optional media upload signing |
| `RATE_LIMIT_*` | Global + auth rate limits |
| `EXPIRY_CRON` | Cron expression for expired-message sweep |

### Frontend (`frontend/.env`)

| Var | Purpose |
|-----|---------|
| `VITE_API_ORIGIN` | Dev-time proxy target |
| `VITE_API_BASE` | Runtime REST base (default `/api`) |
| `VITE_SOCKET_URL` | Optional absolute socket origin |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |

---

## Docker (single-node deployment)

```bash
cp .env.example .env             # fill in secrets
mkdir -p nginx/certs
# drop fullchain.pem + privkey.pem into nginx/certs (or use a self-signed cert)
docker compose up -d --build
```

Compose brings up:

- `postgres` — persistent volume, healthcheck-gated
- `redis` — AOF persistence
- `backend` — Node.js, runs `prisma migrate deploy` on start
- `frontend` — Nginx serving the built React bundle
- `nginx` — TLS termination + WebSocket-aware reverse proxy on `:80/:443`

---

## Testing

Backend uses Node's built-in test runner. Unit + integration split under `backend/tests/`:

```bash
cd backend
npm test                         # unit + integration
```

Integration tests require a running Postgres + Redis (see `backend/.env.test`).

---

## Socket events

Full contract in [`docs/SOCKET_EVENTS.md`](docs/SOCKET_EVENTS.md). Summary:

| Direction | Event | Purpose |
|-----------|-------|---------|
| C → S | `join_room` / `leave_room` | Membership |
| C → S | `send_message` | Persist + fan-out |
| C → S | `typing_start` / `typing_stop` | Debounced typing |
| C → S | `message_delivered` / `message_seen` | Ack pipeline |
| C → S | `edit_message` / `delete_message` | Message lifecycle |
| C → S | `react_message` / `remove_reaction` | Reactions |
| C → S | `fetch_history` | Paged history |
| S → C | `receive_message` | New message |
| S → C | `message_status` | SENT → DELIVERED → READ |
| S → C | `typing` | Peer typing |
| S → C | `message_updated` / `message_deleted` | Post-hoc mutations |
| S → C | `reaction_updated` | Reactions change |
| S → C | `user_online` / `user_offline` / `last_seen` | Presence |
| S → C | `history_loaded` | Response to `fetch_history` |
| S → C | `error` | Structured error |

---

## Database schema

Prisma-managed. Tables: `users`, `refresh_tokens`, `user_sessions`, `blocked_users`, `messages`. Full ER diagram in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

Key indexes:

- `messages (roomId, createdAt DESC)` — history
- `messages (receiverId, status)` — unread + delivery
- `messages (expiresAt)` — cron sweep
- GIN on `searchVector` for FTS

---

## Security posture

- Helmet, tight CORS, `express-rate-limit`, `httpOnly Secure SameSite=Strict` refresh cookies
- Access tokens in memory only (XSS-resistant)
- bcrypt cost 12 for passwords; refresh tokens are opaque, hashed at rest
- JWT `tokenVersion` claim supports server-side revocation without a distributed blacklist
- All socket payloads validated by zod schemas
- Block-list enforced in the service layer — no client can bypass by hitting an alternate endpoint

---

## Roadmap (Phase 10 — see below)

- Signal-style key exchange (X3DH) replacing the pre-shared AES key
- Redis Streams adapter for horizontal Socket.io scale
- Ciphertext-preview index for search (opt-in per message)
- Push notifications (Web Push + APNs bridge)
- Read receipts opt-out per conversation

---

## License

MIT.
