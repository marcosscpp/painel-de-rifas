// Cria ou atualiza um admin. Uso:
//   dev:  docker compose exec api npm run admin:create
//   prod: docker compose -f docker-compose.prod.yml run --rm api node dist/scripts/create-admin.js
// Lê ADMIN_EMAIL, ADMIN_NAME e ADMIN_PASSWORD do ambiente (nunca de argumento, para não ficar no histórico).
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { hashPassword } from '../common/utils/password.js';
import { PiiCipher } from '../infra/crypto/pii-cipher.js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const name = process.env.ADMIN_NAME?.trim() || 'Administrador';
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error('Defina ADMIN_EMAIL e ADMIN_PASSWORD.');
  process.exit(1);
}
if (password.length < 12) {
  console.error('ADMIN_PASSWORD precisa de pelo menos 12 caracteres.');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// O e-mail é gravado cifrado, como os dados dos compradores; o login busca pelo hash.
const cipher = new PiiCipher(process.env.PII_KEYS ?? '', process.env.PII_INDEX_KEY ?? '');
const passwordHash = await hashPassword(password);
await prisma.user.upsert({
  where: { emailHash: cipher.index('email', email) },
  create: { ...cipher.encryptUser({ email }), name, role: 'ADMIN', passwordHash },
  // Trocar a senha também derruba as sessões abertas.
  update: { name, role: 'ADMIN', passwordHash, sessionVersion: { increment: 1 } },
});
console.log(`Admin pronto: ${email}`);
await prisma.$disconnect();
