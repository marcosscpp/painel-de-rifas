import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';

// Dados pessoais do comprador ficam criptografados no banco, campo a campo (AES-256-GCM).
// Formato gravado: "enc:v<versão>:<base64url de iv + tag + texto cifrado>". A versão diz qual
// chave abriu o valor, então dá para trocar de chave sem perder o que já foi gravado.
//
// Para buscar por CPF, celular e e-mail sem descriptografar a tabela toda, cada um ganha uma
// coluna "<campo>Hash" com HMAC-SHA256 do valor normalizado (índice cego, com chave própria).

export const PII_FIELDS = [
  'phone',
  'cpf',
  'email',
  'birthDate',
  'zipCode',
  'street',
  'streetNumber',
  'district',
  'city',
  'state',
  'complement',
  'reference',
] as const;
export type PiiField = (typeof PII_FIELDS)[number];

export const INDEXED_FIELDS = ['phone', 'cpf', 'email'] as const;
export type IndexedField = (typeof INDEXED_FIELDS)[number];

const PREFIX = 'enc:v';
const IV_BYTES = 12;
const TAG_BYTES = 16;

// Usuário como sai do banco (birthDate é texto cifrado) e como o código usa (Date).
type WithBirthDate<T> = 'birthDate' extends keyof T ? Omit<T, 'birthDate'> & { birthDate: Date | null } : T;
export type DecryptedUser<T> = WithBirthDate<T>;

type PlainValue = string | Date | null | undefined;

// Dados prontos para o Prisma: campos pessoais viram texto cifrado, mais os hashes de busca.
export type EncryptedUser<T> = {
  [K in keyof T]: K extends PiiField ? string | null | Extract<T[K], undefined> : T[K];
} & { phoneHash?: string | null; cpfHash?: string | null; emailHash?: string | null };

const decodeKey = (b64: string, what: string) => {
  const key = Buffer.from(b64.trim(), 'base64');
  if (key.length !== 32) throw new Error(`${what}: a chave precisa ter 32 bytes em base64 (openssl rand -base64 32)`);
  return key;
};

export class PiiCipher {
  private readonly keys = new Map<number, Buffer>();
  private readonly indexKey: Buffer;
  readonly currentVersion: number;

  // keys: "1:<base64>,2:<base64>". Grava com a versão mais alta; as outras só leem.
  constructor(keys: string, indexKey: string) {
    for (const part of keys.split(',').filter((p) => p.trim())) {
      const m = /^\s*(\d+):(.+)$/.exec(part);
      if (!m) throw new Error('PII_KEYS: use o formato "1:<chave base64>,2:<chave base64>"');
      this.keys.set(Number(m[1]), decodeKey(m[2], `PII_KEYS versão ${m[1]}`));
    }
    if (!this.keys.size) throw new Error('PII_KEYS vazia');
    this.currentVersion = Math.max(...this.keys.keys());
    this.indexKey = decodeKey(indexKey, 'PII_INDEX_KEY');
  }

  encrypt(plain: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', this.keys.get(this.currentVersion)!, iv);
    const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return `${PREFIX}${this.currentVersion}:${Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url')}`;
  }

  // Valor sem o prefixo é texto puro de antes da migração: devolve como está.
  decrypt(value: string | null | undefined): string | null {
    if (value == null) return null;
    const m = /^enc:v(\d+):([A-Za-z0-9_-]+)$/.exec(value);
    if (!m) return value;
    const key = this.keys.get(Number(m[1]));
    if (!key) throw new Error(`Chave de dados pessoais versão ${m[1]} não está em PII_KEYS`);
    const raw = Buffer.from(m[2], 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, IV_BYTES));
    decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    return Buffer.concat([decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString('utf8');
  }

  // Texto puro ou cifrado com chave antiga: precisa ser regravado.
  isStale(value: string | null | undefined): boolean {
    return value != null && !value.startsWith(`${PREFIX}${this.currentVersion}:`);
  }

  // Índice cego para busca exata. O nome do campo entra no HMAC: CPF e celular iguais não colidem.
  index(field: IndexedField, normalized: string): string {
    return createHmac('sha256', this.indexKey).update(`${field}:${normalized}`).digest('base64url');
  }

  // Dados para gravar: campos pessoais cifrados e, para celular/CPF/e-mail, o hash de busca.
  // Os demais campos passam sem mudança. undefined continua undefined (não mexe na coluna).
  encryptUser<T extends Record<string, unknown>>(data: T): EncryptedUser<T> {
    const out: Record<string, unknown> = { ...data };
    for (const field of PII_FIELDS) {
      if (!(field in data) || data[field] === undefined) continue;
      const value = data[field] as PlainValue;
      const plain = value instanceof Date ? value.toISOString().slice(0, 10) : value;
      out[field] = plain == null ? null : this.encrypt(plain);
      if ((INDEXED_FIELDS as readonly string[]).includes(field)) {
        out[`${field}Hash`] = plain == null ? null : this.index(field as IndexedField, plain);
      }
    }
    return out as EncryptedUser<T>;
  }

  // Usuário lido do banco com os campos pessoais abertos (só os que vieram no select).
  decryptUser<T extends Record<string, unknown>>(user: T): DecryptedUser<T>;
  decryptUser<T extends Record<string, unknown>>(user: T | null): DecryptedUser<T> | null;
  decryptUser<T extends Record<string, unknown>>(user: T | null): DecryptedUser<T> | null {
    if (!user) return null;
    const out: Record<string, unknown> = { ...user };
    for (const field of PII_FIELDS) {
      if (!(field in user)) continue;
      const plain = this.decrypt(user[field] as string | null);
      out[field] = field === 'birthDate' && plain ? new Date(`${plain.slice(0, 10)}T00:00:00Z`) : plain;
    }
    return out as DecryptedUser<T>;
  }
}
