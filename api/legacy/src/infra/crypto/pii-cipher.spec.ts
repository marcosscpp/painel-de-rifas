import { makeCipher, makePrisma, TEST_PII_KEY } from '../../../test/helpers/mocks.js';
import { PiiBackfillService } from './pii-backfill.service.js';
import { PiiCipher } from './pii-cipher.js';

const KEY_2 = Buffer.alloc(32, 7).toString('base64');

describe('PiiCipher', () => {
  const cipher = makeCipher();

  it('cifra e abre de volta; o mesmo valor vira textos diferentes', () => {
    const a = cipher.encrypt('52998224725');
    const b = cipher.encrypt('52998224725');
    expect(a).toMatch(/^enc:v1:/);
    expect(a).not.toContain('52998224725');
    expect(a).not.toBe(b);
    expect(cipher.decrypt(a)).toBe('52998224725');
    expect(cipher.decrypt('Rua das Flores, ção')).toBe('Rua das Flores, ção');
  });

  it('valor adulterado não abre', () => {
    const v = cipher.encrypt('maria@x.com');
    const tampered = v.slice(0, -2) + (v.endsWith('A') ? 'BB' : 'AA');
    expect(() => cipher.decrypt(tampered)).toThrow();
  });

  it('texto puro de antes da migração passa como está; null continua null', () => {
    expect(cipher.decrypt('11987654321')).toBe('11987654321');
    expect(cipher.decrypt(null)).toBeNull();
  });

  it('hash de busca é estável, depende do campo e da chave', () => {
    expect(cipher.index('cpf', '52998224725')).toBe(cipher.index('cpf', '52998224725'));
    expect(cipher.index('cpf', '11987654321')).not.toBe(cipher.index('phone', '11987654321'));
    const other = new PiiCipher(`1:${TEST_PII_KEY}`, Buffer.alloc(32, 9).toString('base64'));
    expect(other.index('cpf', '52998224725')).not.toBe(cipher.index('cpf', '52998224725'));
  });

  it('troca de chave: grava com a versão mais alta e ainda lê a antiga', () => {
    const old = cipher.encrypt('São Paulo');
    const rotated = new PiiCipher(`1:${TEST_PII_KEY},2:${KEY_2}`, Buffer.alloc(32, 2).toString('base64'));
    expect(rotated.currentVersion).toBe(2);
    expect(rotated.decrypt(old)).toBe('São Paulo');
    expect(rotated.encrypt('x')).toMatch(/^enc:v2:/);
    expect(rotated.isStale(old)).toBe(true);
    expect(rotated.isStale(rotated.encrypt('x'))).toBe(false);
    expect(rotated.isStale(null)).toBe(false);
    // Sem a chave da versão, o valor não abre (e o erro diz qual falta).
    const onlyNew = new PiiCipher(`2:${KEY_2}`, Buffer.alloc(32, 2).toString('base64'));
    expect(() => onlyNew.decrypt(old)).toThrow('versão 1');
  });

  it('recusa chave mal formada', () => {
    expect(() => new PiiCipher('1:curta', Buffer.alloc(32).toString('base64'))).toThrow('32 bytes');
    expect(() => new PiiCipher('sem-versao', Buffer.alloc(32).toString('base64'))).toThrow('formato');
    expect(() => new PiiCipher(`1:${TEST_PII_KEY}`, 'curta')).toThrow('PII_INDEX_KEY');
  });

  it('encryptUser: só mexe nos campos pessoais presentes e gera os hashes', () => {
    const data = cipher.encryptUser({
      name: 'Maria',
      phone: '11987654321',
      email: null,
      birthDate: new Date(Date.UTC(1990, 4, 10)),
      city: undefined,
    });
    expect(data.name).toBe('Maria');
    expect(data.phone).toMatch(/^enc:v1:/);
    expect(data.phoneHash).toBe(cipher.index('phone', '11987654321'));
    expect(data.email).toBeNull();
    expect(data.emailHash).toBeNull();
    expect(data).not.toHaveProperty('cpfHash');
    expect(data.city).toBeUndefined();
    expect(cipher.decryptUser(data)).toMatchObject({
      phone: '11987654321',
      birthDate: new Date(Date.UTC(1990, 4, 10)),
    });
  });
});

describe('PiiBackfillService', () => {
  it('cifra cadastros em texto puro e recifra os de chave antiga, em lotes', async () => {
    const prisma = makePrisma();
    const rotated = new PiiCipher(`1:${TEST_PII_KEY},2:${KEY_2}`, Buffer.alloc(32, 2).toString('base64'));
    const legacy = { id: 'a', phone: '11987654321', cpf: '52998224725', email: 'maria@x.com', birthDate: '1990-05-10', city: 'Campinas' };
    const oldKey = { id: 'b', ...makeCipher().encryptUser({ phone: '11911112222', email: null }) };
    prisma.user.findMany.mockResolvedValueOnce([legacy, oldKey]).mockResolvedValueOnce([]);

    const service = new PiiBackfillService(prisma as never, rotated);
    await expect(service.run()).resolves.toBe(2);

    expect(prisma.user.findMany.mock.calls[1][0].where.id).toEqual({ gt: 'b' });
    const [first, second] = prisma.user.update.mock.calls.map((c) => c[0]);
    expect(first.where).toEqual({ id: 'a' });
    expect(first.data).toMatchObject({
      phone: expect.stringMatching(/^enc:v2:/),
      birthDate: expect.stringMatching(/^enc:v2:/),
      cpfHash: rotated.index('cpf', '52998224725'),
      emailHash: rotated.index('email', 'maria@x.com'),
    });
    expect(rotated.decryptUser(first.data)).toMatchObject({
      phone: '11987654321',
      city: 'Campinas',
      birthDate: new Date(Date.UTC(1990, 4, 10)),
    });
    expect(second.data.phone).toMatch(/^enc:v2:/);
    expect(rotated.decrypt(second.data.phone)).toBe('11911112222');
  });

  it('nada a fazer: uma consulta e pronto', async () => {
    const prisma = makePrisma();
    prisma.user.findMany.mockResolvedValue([]);
    await expect(new PiiBackfillService(prisma as never, makeCipher()).run()).resolves.toBe(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
