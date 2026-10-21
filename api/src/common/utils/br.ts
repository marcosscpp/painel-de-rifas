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
