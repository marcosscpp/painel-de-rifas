-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "refundRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reservedNumbers" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "gatewayCustomerId" TEXT;
