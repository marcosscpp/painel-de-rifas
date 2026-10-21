const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const integer = new Intl.NumberFormat('pt-BR')

// Valores trafegam em centavos (inteiro) para não ter erro de arredondamento.
export const formatCents = (cents: number) => brl.format(cents / 100)

export const formatInt = (n: number) => integer.format(n)

export const formatDateTime = (iso: string | Date) => dateTime.format(new Date(iso))

export const formatPhone = (digits: string) =>
  digits.replace(/\D/g, '').replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')

// Número da rifa com zeros à esquerda (ex.: 0042 numa rifa de 10.000 números).
export const padNumber = (n: number, total: number) => String(n).padStart(String(total - 1).length, '0')

// "1.234,56" ou "1234.56" → 123456 centavos. Retorna null se não for um valor válido.
export function parseMoneyToCents(input: string): number | null {
  const clean = input.trim().replace(/[R$\s]/g, '')
  if (!clean) return null
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  return Math.round(Number(normalized) * 100)
}

// 123456 → "1234,56" (para preencher input)
export const centsToInput = (cents: number | null | undefined) =>
  cents == null ? '' : (cents / 100).toFixed(2).replace('.', ',')

// ISO ↔ valor de <input type="datetime-local"> no fuso do navegador.
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const localInputToIso = (value: string) => (value ? new Date(value).toISOString() : null)

// Máscara enquanto digita: (11) 98765-4321
export function maskPhoneInput(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// Máscara enquanto digita: 123.456.789-01
export function maskCpfInput(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}
