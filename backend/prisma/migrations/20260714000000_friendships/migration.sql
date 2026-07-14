-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- CreateTable
CREATE TABLE "friendships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userAId" UUID NOT NULL,
    "userBId" UUID NOT NULL,
    "initiatorId" UUID NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMPTZ(6),
    CONSTRAINT "friendships_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "friendships_canonical_order" CHECK ("userAId" < "userBId"),
    CONSTRAINT "friendships_initiator_is_pair" CHECK ("initiatorId" = "userAId" OR "initiatorId" = "userBId")
);

CREATE UNIQUE INDEX "friendships_userAId_userBId_key" ON "friendships"("userAId", "userBId");
CREATE INDEX "friendships_userAId_status_idx" ON "friendships"("userAId", "status");
CREATE INDEX "friendships_userBId_status_idx" ON "friendships"("userBId", "status");
CREATE INDEX "friendships_initiatorId_idx" ON "friendships"("initiatorId");

ALTER TABLE "friendships"
  ADD CONSTRAINT "friendships_userAId_fkey"
  FOREIGN KEY ("userAId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "friendships"
  ADD CONSTRAINT "friendships_userBId_fkey"
  FOREIGN KEY ("userBId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "friendships"
  ADD CONSTRAINT "friendships_initiatorId_fkey"
  FOREIGN KEY ("initiatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
