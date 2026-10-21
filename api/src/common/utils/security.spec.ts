import { hashPassword, verifyPassword } from './password.js';
import { safeCompare } from './safe-compare.js';

describe('senhas', () => {
  it('gera hash argon2id e confere a senha', async () => {
    const hash = await hashPassword('minha-senha-forte');
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain('minha-senha-forte');
    await expect(verifyPassword(hash, 'minha-senha-forte')).resolves.toBe(true);
    await expect(verifyPassword(hash, 'outra')).resolves.toBe(false);
  });

  it('mesmo texto gera hashes diferentes (salt)', async () => {
    expect(await hashPassword('x')).not.toBe(await hashPassword('x'));
  });

  it('hash corrompido não derruba, só falha', async () => {
    await expect(verifyPassword('lixo', 'x')).resolves.toBe(false);
  });
});

describe('safeCompare', () => {
  it('compara segredos de tamanhos iguais ou diferentes sem lançar erro', () => {
    expect(safeCompare('token-123', 'token-123')).toBe(true);
    expect(safeCompare('token-123', 'token-124')).toBe(false);
    expect(safeCompare('curto', 'bem-mais-comprido')).toBe(false);
  });
});
