-- Modo de venda passa a ser só Roleta (QUANTITY) ou Grade (PICK), escolhido pelo admin.
-- Rifas que estavam em "os dois" viram Roleta.
UPDATE "raffles" SET "saleMode" = 'QUANTITY' WHERE "saleMode" = 'BOTH';

ALTER TYPE "SaleMode" RENAME TO "SaleMode_old";
CREATE TYPE "SaleMode" AS ENUM ('QUANTITY', 'PICK');
ALTER TABLE "raffles" ALTER COLUMN "saleMode" DROP DEFAULT;
ALTER TABLE "raffles" ALTER COLUMN "saleMode" TYPE "SaleMode" USING ("saleMode"::text::"SaleMode");
ALTER TABLE "raffles" ALTER COLUMN "saleMode" SET DEFAULT 'QUANTITY';
DROP TYPE "SaleMode_old";
