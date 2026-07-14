# Socket Events

All payloads are validated by zod-style schemas. Every emit from the client accepts an acknowledgement callback for delivery guarantees on important events.

---

## Client → Server

### `join_room`
```
{ roomId: string }              // deterministic id
```
Ack: `{ ok: true }` or `{ ok: false, error: string }`.

### `leave_room`
```
{ roomId: string }
```

### `send_message`
```
{
  clientMessageId: string,      // uuid, used for optimistic reconciliation
  roomId: string,
  receiverId: string,
  encryptedPayload: string,     // base64 ciphertext (AES-GCM)
  iv: string,                   // base64 IV
  mediaUrl?: string,
  mediaType?: 'image'|'video'|'file'|'audio',
  thumbnailUrl?: string,
  fileSize?: number,
  replyToMessageId?: string,
  expiresInSeconds?: number     // 300 | 3600 | 86400 | 604800
}
```
Ack: `{ ok: true, message: MessageDto }` or `{ ok: false, error }`.

### `typing_start` / `typing_stop`
```
{ roomId: string }
```

### `message_delivered`
```
{ messageIds: string[] }
```

### `message_seen`
```
{ messageIds: string[] }
```

### `edit_message`
```
{ messageId: string, encryptedPayload: string, iv: string }
```

### `delete_message`
```
{ messageId: string }           // soft delete
```

### `react_message`
```
{ messageId: string, emoji: string }
```

### `remove_reaction`
```
{ messageId: string, emoji: string }
```

### `fetch_history`
```
{ roomId: string, cursor?: string, limit?: number }  // limit ≤ 50
```

---

## Server → Client

### `receive_message`
```
{ message: MessageDto }
```

### `message_status`
```
{ messageId: string, status: 'SENT'|'DELIVERED'|'READ', at: string }
```

### `typing`
```
{ userId: string, roomId: string, expiresAt: string }
```

### `message_updated`
```
{ message: MessageDto }
```

### `message_deleted`
```
{ messageId: string, roomId: string }
```

### `reaction_updated`
```
{ messageId: string, reactions: Reaction[] }
```

### `user_online` / `user_offline`
```
{ userId: string, at: string }
```

### `last_seen`
```
{ userId: string, at: string }
```

### `history_loaded`
```
{ roomId: string, messages: MessageDto[], nextCursor: string|null }
```

### `error`
```
{ code: string, message: string, details?: unknown }
```

---

## MessageDto shape

```
{
  id: string,
  clientMessageId: string,
  senderId: string,
  receiverId: string,
  roomId: string,
  encryptedPayload: string,
  iv: string,
  mediaUrl: string|null,
  mediaType: string|null,
  thumbnail: string|null,
  fileSize: number|null,
  status: 'SENT'|'DELIVERED'|'READ',
  replyToMessageId: string|null,
  reactions: Reaction[],
  editedAt: string|null,
  deletedAt: string|null,
  expiresAt: string|null,
  createdAt: string,
  updatedAt: string
}

Reaction = { emoji: string, userId: string, createdAt: string }
```
