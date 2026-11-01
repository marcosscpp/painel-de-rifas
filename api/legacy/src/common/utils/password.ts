import { argon2id, hash, verify, type HashOptions } from 'argon2';

// argon2id com parâmetros da recomendação OWASP (19 MiB, 2 iterações).
const OPTIONS: HashOptions = {
  type: argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export const hashPassword = (plain: string) => hash(plain, OPTIONS);

export const verifyPassword = (digest: string, plain: string) =>
  verify(digest, plain).catch(() => false);
