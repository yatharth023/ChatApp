# REST API

Base: `/api`. All bodies are JSON. All errors follow:

```
{ error: { code: string, message: string, details?: unknown } }
```

Auth: `Authorization: Bearer <accessToken>` except public routes.

---

## Auth

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/register` | public | Create account |
| POST | `/api/auth/login` | public | Login, set refresh cookie |
| POST | `/api/auth/refresh` | cookie | Rotate refresh, issue access |
| POST | `/api/auth/logout` | required | Revoke current session |
| POST | `/api/auth/logout-all` | required | Bump tokenVersion + delete sessions |
| GET  | `/api/auth/me` | required | Current user |

`register` body:
```
{ username, email, password }
```

`login` body:
```
{ email, password, rememberMe?: boolean }
```

---

## Users

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET  | `/api/users/search?q=&limit=&cursor=` | required | Search by username/email |
| GET  | `/api/users/:userId` | required | Public profile |
| PATCH | `/api/users/me` | required | Update self (username, bio, avatarUrl) |
| PATCH | `/api/users/me/password` | required | Change password |
| DELETE | `/api/users/me` | required | Delete account (cascade) |

---

## Messages

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET  | `/api/messages/history?peerId=&cursor=&limit=` | required | Paged history for a conversation |
| GET  | `/api/messages/search?peerId=&q=&limit=` | required | Full-text search (ciphertext-preview) |
| GET  | `/api/messages/conversations` | required | Sidebar conversations w/ last message |

---

## Block

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST  | `/api/block/:userId` | required | Block a user |
| DELETE | `/api/block/:userId` | required | Unblock |
| GET  | `/api/block` | required | List blocked users |

---

## Upload

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/upload/signature` | required | Cloudinary signed upload params |

Response:
```
{ timestamp, signature, apiKey, cloudName, folder, uploadPreset }
```
