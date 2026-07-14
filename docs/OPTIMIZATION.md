# Optimization playbook

Applied in Phase 10; retain as an operating reference.

## 1. Socket horizontal scale

`@socket.io/redis-adapter` is wired in for `NODE_ENV=production`. Adds two dedicated Redis connections (`redisPub`, `redisSub`) so any emit on one node reaches sockets connected to another. Sticky sessions still required at the LB (Nginx below sits in front of a single node — swap for `ip_hash` upstream when horizontal-scaling).

## 2. Read-through cache

`services/cacheService.js` — jittered JSON cache. Recommended targets:

- `users/profile` responses  (60 s TTL)
- `messages/conversations` sidebar  (15 s TTL)
- Blocklist per user  (60 s TTL)

Invalidate on write. All caches namespaced by userId — no cross-user leakage.

## 3. Database

Prisma migration includes:

- `messages (roomId, createdAt DESC)` — history pagination
- `messages (receiverId, status)` — unread counts
- `messages (expiresAt)` — cron sweep
- GIN over `searchVector`

Recommended Postgres settings for a small production node:

```
shared_buffers      = 256MB
effective_cache_size = 1GB
work_mem            = 32MB
maintenance_work_mem = 128MB
random_page_cost    = 1.1        # SSD
autovacuum          = on
```

## 4. Frontend

- Vite `manualChunks` splits React, TanStack Query, Socket.io-client, UI libs.
- Long history rendered from Zustand slice; virtualization is deferred until a
  conversation exceeds 500 messages (drop-in via `react-window`).
- All heavy interactions (typing, search) are debounced.

## 5. Delivery + backpressure

- Socket `send_message` limited to 60/min per user via Redis `INCR`.
- Refresh tokens rotated on every use; expired rows purged hourly.
- Presence tracked with reference counts — avoids online/offline flapping on
  reconnects.

## 6. Cost of encryption

AES-GCM encrypt/decrypt runs off-main-thread inside the SubtleCrypto engine.
Benchmarked: <2 ms per typical text message on a mid-range laptop, so the
cost is invisible in interactive UX.
