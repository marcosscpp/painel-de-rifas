// Validações de dados brasileiros (telefone e CPF). Testadas em br.spec.ts.

export const onlyDigits = (v: string) => v.replace(/\D/g, '');

// Aceita com ou sem +55, com ou sem máscara. Retorna DDD + número (10 ou 11 dígitos) ou null.
export function normalizePhone(raw: string): string | null {
  let d = onlyDigits(raw);
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return null;
  if (d.length === 11 && d[2] !== '9') return null; // celular começa com 9
  return d;
}

export function normalizeCpf(raw: string): string | null {
  const d = onlyDigits(raw);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return null;
  const check = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return check(9) === Number(d[9]) && check(10) === Number(d[10]) ? d : null;
}

// (11) 9****-4321: o suficiente para o comprador reconhecer, sem expor o número.
export const maskPhone = (d: string) =>
  d.length >= 10 ? `(${d.slice(0, 2)}) ${d[2]}****-${d.slice(-4)}` : '****';

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export function normalizeZip(raw: string): string | null {
  const d = onlyDigits(raw);
  return d.length === 8 ? d : null;
}

// Data AAAA-MM-DD → Date (UTC, meia-noite). Recusa datas impossíveis como 31/02.
export function parseDateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3])
    ? d
    : null;
}

// Idade completa em anos na data de referência (aniversário conta no próprio dia).
export function ageOn(birth: Date, today = new Date()): number {
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age--;
  return age;
}
