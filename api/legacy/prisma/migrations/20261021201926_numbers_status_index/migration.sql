-- DropIndex
DROP INDEX "raffle_numbers_raffleId_status_idx";

-- CreateIndex
CREATE INDEX "raffle_numbers_raffleId_status_number_idx" ON "raffle_numbers"("raffleId", "status", "number");
