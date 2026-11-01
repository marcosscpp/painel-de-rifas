-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "refundedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "raffles" ADD COLUMN     "lotteryPrizes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "winnerOrderId" UUID;
