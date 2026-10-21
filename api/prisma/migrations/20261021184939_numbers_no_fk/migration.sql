-- DropForeignKey
ALTER TABLE "raffle_numbers" DROP CONSTRAINT "raffle_numbers_raffleId_fkey";

-- DropIndex
DROP INDEX "raffle_numbers_status_reservedUntil_idx";
