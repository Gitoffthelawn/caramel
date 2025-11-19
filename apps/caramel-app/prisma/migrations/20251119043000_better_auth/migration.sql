/*
  Warnings:

  - You are about to drop the column `token_type` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `accounts` table. All the data in the column will be lost.
  - The `expires_at` column on the `accounts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `user_id` on table `sessions` required. This step will fail if there are existing NULL values in that column.
*/
-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "token_type",
DROP COLUMN "type",
ADD COLUMN     "password" TEXT,
ADD COLUMN     "refresh_token_expires_at" TIMESTAMPTZ(6),
DROP COLUMN "expires_at",
ADD COLUMN     "expires_at" TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "user_agent" TEXT,
ALTER COLUMN "user_id" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_value_key" ON "verification_tokens"("identifier", "value");
