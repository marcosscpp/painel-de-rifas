-- DropIndex
DROP INDEX "raffles_status_idx";

-- AlterTable
ALTER TABLE "raffles" ADD COLUMN     "paidCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "reservedCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "raffles_status_createdAt_idx" ON "raffles"("status", "createdAt");
