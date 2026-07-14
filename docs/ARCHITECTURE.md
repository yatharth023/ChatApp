# ChatApp — Architecture

Production-grade 1-on-1 private messaging platform built on the PERN stack, Socket.io, and Redis.

---

## 1. Goals and constraints

| Goal | Constraint |
|------|-----------|
| End-to-end encrypted messages | Server never sees plaintext |
| Sub-second delivery on wire | WebSocket transport only |
| Horizontal scale | Redis-backed presence + sticky sockets |
| Zero data loss on refresh | Server is source of truth, client optimistic UI |
| 10-year maintainability | Feature-based folders, strict layering |

---

## 2. Layering rules

```
HTTP / Socket  →  Controller / Handler  →  Service  →  Repository  →  Prisma  →  PostgreSQL
                                              │
                                              └──▶  Redis (presence, sessions, rate-limit)
```

Layer ownership:

| Layer | Owns | Never |
|-------|------|-------|
| Controller / Handler | Validation, response shape | Prisma, business rules |
| Service | Business rules, coordination | HTTP concerns, raw SQL |
| Repository | Prisma calls | Business rules, HTTP |
| Utility | Pure helpers | Side effects |

---

## 3. Folder layout

```
ChatApp/
├── backend/
│   ├── src/
│   │   ├── config/          # env, prisma, redis, logger
│   │   ├── middleware/      # auth, errors, rate-limit, validate
│   │   ├── controllers/     # REST controllers
│   │   ├── routes/          # Express routers
│   │   ├── services/        # Business logic
│   │   ├── repositories/    # Prisma queries
│   │   ├── socket/          # Socket.io layer
│   │   │   ├── handlers/    # Feature-scoped socket handlers
│   │   │   └── utils/       # Room-id helper, ack helper
│   │   ├── validators/      # zod-style schemas
│   │   ├── cron/            # node-cron jobs
│   │   └── utils/           # Pure helpers
│   ├── prisma/              # schema + migrations
│   └── tests/               # unit + integration
├── frontend/
│   └── src/
│       ├── config/          # runtime env
│       ├── layouts/         # AppLayout, AuthLayout
│       ├── pages/           # Route-level components
│       ├── components/
│       │   ├── auth/
│       │   ├── chat/
│       │   ├── common/
│       │   └── settings/
│       ├── context/         # React contexts (Auth, Socket, Theme)
│       ├── hooks/           # Custom hooks
│       ├── services/        # API + socket clients
│       ├── store/           # Zustand slices (only where needed)
│       ├── utils/           # crypto, roomId, date, storage
│       └── assets/
├── nginx/
├── docs/
└── docker-compose.yml
```

---

## 4. Authentication

```
Register / Login
  → bcrypt(password, 12)
  → issue access JWT   (15 minutes, HS256)
  → issue refresh JWT  (30 days, rotated on every use)
  → store bcrypt(refresh) in refresh_tokens
  → issue Set-Cookie: refresh=... HttpOnly Secure SameSite=Strict Path=/api/auth

Access token
  → Authorization: Bearer <token>
  → Kept in memory on client (never localStorage)

Refresh
  → POST /api/auth/refresh (cookie only)
  → Verify signature, look up hash, rotate → new access + refresh
  → Old refresh row deleted (single-use)

Logout          → revoke current refresh + session row
Logout-all      → delete every session for user, bump `tokenVersion`
                  → in-flight access tokens fail on next verify

Socket auth
  → client passes { auth: { token } }
  → verify JWT, check tokenVersion, attach socket.user
```

Password rules: min length 8, must contain letter + digit, bcrypt cost 12.

---

## 5. Socket architecture

**Transport.** WebSocket only. `transports: ['websocket']`. No long-polling.

**Multiplexing.** A user connecting from two devices gets two sockets, both bound to `user:{id}` room. Presence stays online while any socket lives.

**Room naming.** `roomId = min(a,b) + '_' + max(a,b)`. Deterministic, dedup-safe.

**Events.**

| Direction | Event | Purpose |
|-----------|-------|---------|
| C → S | `join_room` | Join `room:{roomId}` |
| C → S | `leave_room` | Leave room |
| C → S | `send_message` | Persist + fan-out |
| C → S | `typing_start` / `typing_stop` | Debounced typing |
| C → S | `message_seen` | Bulk mark READ |
| C → S | `message_delivered` | Ack on receive |
| C → S | `edit_message` | Update ciphertext |
| C → S | `delete_message` | Soft delete |
| C → S | `react_message` / `remove_reaction` | Reactions |
| C → S | `fetch_history` | Paged history |
| S → C | `receive_message` | New message |
| S → C | `message_status` | SENT / DELIVERED / READ transitions |
| S → C | `typing` | Peer typing (with expiry) |
| S → C | `message_updated` | Edit or reaction |
| S → C | `message_deleted` | Soft delete |
| S → C | `user_online` / `user_offline` / `last_seen` | Presence |
| S → C | `error` | Structured error |

**Backpressure.** Rate-limit `send_message` per socket via `Redis INCR` with TTL.

---

## 6. Message model + status pipeline

```
SENT       ← DB commit succeeded
DELIVERED  ← recipient socket acked receipt (server marks + emits back to sender)
READ       ← recipient client emitted message_seen (viewport)
```

Read receipts are batched: a single `message_seen` payload contains an array of message IDs.

---

## 7. Presence

Redis structure:

```
online:{userId}         → integer (socket count)
socket:{socketId}       → userId
user_sockets:{userId}   → set of socketIds
last_seen:{userId}      → ISO timestamp
```

On connect: `INCR online:{userId}`. On disconnect: `DECR`. If zero → offline + timestamp last seen. Presence never derived from raw socket state.

---

## 8. Encryption

- Sender derives a symmetric AES-GCM key per conversation (Web Crypto), stored in IndexedDB.
- Key handshake is out-of-scope for v1 (pre-shared per pair). Server ships only `encryptedPayload` + IV.
- Server never decrypts. Search is on ciphertext plus optional server-side plaintext preview for the sender only (opt-out).

---

## 9. Deployment

```
docker-compose.yml
├── postgres  (persistent volume)
├── redis     (persistent volume)
├── backend   (multi-stage build, non-root)
├── frontend  (Vite build → served by Nginx)
└── nginx     (TLS terminator, /api → backend, /socket.io → backend)
```

Backend can be scaled by increasing replicas; Redis adapter is added in Phase 10.

---

## 10. Testing pyramid

- **Unit** — services + utils (pure).
- **Integration** — REST + Prisma against a test database.
- **Socket** — supertest + socket.io-client harness.
- **Component** — critical UI flows (login, send-message, typing).

CI runs the pyramid on every PR.
