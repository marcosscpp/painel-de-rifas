-- Dados pessoais passam a ser gravados cifrados (AES-256-GCM, um IV por valor), então o
-- mesmo CPF vira textos diferentes e a unicidade vai para as colunas de hash (HMAC).
-- Os valores atuais seguem em texto puro até a API subir: ela cifra tudo e preenche os
-- hashes antes de aceitar requisições (PiiBackfillService).

-- DropIndex
DROP INDEX "users_cpf_key";
DROP INDEX "users_email_key";
DROP INDEX "users_phone_key";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "cpfHash" TEXT,
ADD COLUMN     "emailHash" TEXT,
ADD COLUMN     "phoneHash" TEXT,
ALTER COLUMN "birthDate" SET DATA TYPE TEXT USING to_char("birthDate", 'YYYY-MM-DD');

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneHash_key" ON "users"("phoneHash");

-- CreateIndex
CREATE UNIQUE INDEX "users_cpfHash_key" ON "users"("cpfHash");

-- CreateIndex
CREATE UNIQUE INDEX "users_emailHash_key" ON "users"("emailHash");
