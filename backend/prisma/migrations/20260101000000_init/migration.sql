-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" VARCHAR(32) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" VARCHAR(120) NOT NULL,
    "avatarUrl" VARCHAR(1024),
    "bio" VARCHAR(280),
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" TIMESTAMPTZ(6),
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_username_idx" ON "users"("username");
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "jti" VARCHAR(128) NOT NULL,
    "tokenHash" VARCHAR(120) NOT NULL,
    "deviceInfo" VARCHAR(256),
    "ip" VARCHAR(64),
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "refresh_tokens_jti_key" ON "refresh_tokens"("jti");
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

ALTER TABLE "refresh_tokens"
  ADD CONSTRAINT "refresh_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "refreshJti" VARCHAR(128) NOT NULL,
    "userAgent" VARCHAR(512),
    "ip" VARCHAR(64),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_sessions_refreshJti_key" ON "user_sessions"("refreshJti");
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

ALTER TABLE "user_sessions"
  ADD CONSTRAINT "user_sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "blocked_users" (
    "blockerId" UUID NOT NULL,
    "blockedId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "blocked_users_pkey" PRIMARY KEY ("blockerId", "blockedId")
);

CREATE INDEX "blocked_users_blockedId_idx" ON "blocked_users"("blockedId");

ALTER TABLE "blocked_users"
  ADD CONSTRAINT "blocked_users_blockerId_fkey"
  FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blocked_users"
  ADD CONSTRAINT "blocked_users_blockedId_fkey"
  FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clientMessageId" UUID,
    "senderId" UUID NOT NULL,
    "receiverId" UUID NOT NULL,
    "roomId" VARCHAR(96) NOT NULL,
    "encryptedPayload" TEXT NOT NULL,
    "iv" VARCHAR(64) NOT NULL,
    "mediaUrl" VARCHAR(1024),
    "mediaType" VARCHAR(24),
    "thumbnail" VARCHAR(1024),
    "fileSize" INTEGER,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "replyToMessageId" UUID,
    "reactions" JSONB NOT NULL DEFAULT '[]',
    "editedAt" TIMESTAMPTZ(6),
    "deletedAt" TIMESTAMPTZ(6),
    "expiresAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "messages_sender_client_message_id_key"
  ON "messages"("senderId", "clientMessageId")
  WHERE "clientMessageId" IS NOT NULL;

CREATE INDEX "messages_roomId_createdAt_idx" ON "messages"("roomId", "createdAt" DESC);
CREATE INDEX "messages_receiverId_status_idx" ON "messages"("receiverId", "status");
CREATE INDEX "messages_expiresAt_idx" ON "messages"("expiresAt");
CREATE INDEX "messages_replyToMessageId_idx" ON "messages"("replyToMessageId");

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_receiverId_fkey"
  FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_replyToMessageId_fkey"
  FOREIGN KEY ("replyToMessageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Full text search over metadata that leaks no plaintext:
--   mediaUrl (public link) + mediaType. Server-side ciphertext preview is
--   an optional Phase 10 addition; for now the searchVector indexes
--   "search-safe" columns without touching encryptedPayload.
ALTER TABLE "messages" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce("mediaUrl", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("mediaType", '')), 'B')
  ) STORED;

CREATE INDEX "messages_search_vector_idx" ON "messages" USING GIN ("searchVector");
