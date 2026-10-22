import { z } from 'zod'
import { dateInputToIso, parseMoneyToCents } from '@/shared/utils/format'

// Campos brasileiros reutilizados pelos formulários (Zod). A API valida de novo do lado dela;
// aqui o objetivo é avisar cedo e com mensagem em português.

export const onlyDigits = (v: string) => v.replace(/\D/g, '')

export function isValidCpf(raw: string) {
  const d = onlyDigits(raw)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const check = (len: number) => {
    const sum = [...d.slice(0, len)].reduce((acc, n, i) => acc + Number(n) * (len + 1 - i), 0)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  return check(9) === Number(d[9]) && check(10) === Number(d[10])
}

// Idade completa hoje para uma data AAAA-MM-DD.
export function ageFromIso(iso: string, today = new Date()) {
  const [y, m, d] = iso.split('-').map(Number)
  let age = today.getFullYear() - y
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--
  return age
}

export const zRequired = (label: string) => z.string().trim().min(1, `Informe ${label}`)

export const zFullName = z
  .string()
  .trim()
  .min(1, 'Informe seu nome')
  .max(80, 'Nome muito longo')
  .regex(/^\S{2,}(\s+\S+)+$/u, 'Informe nome e sobrenome')

export const zEmail = z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido').max(254)

// Celular com DDD; o valor sai só com dígitos.
export const zPhone = z
  .string()
  .transform(onlyDigits)
  .refine((d) => d.length >= 10 && d.length <= 11, 'Celular incompleto')

export const zCpf = z
  .string()
  .transform(onlyDigits)
  .refine((d) => d.length === 11, 'CPF incompleto')
  .refine(isValidCpf, 'CPF inválido')

export const zZip = z
  .string()
  .transform(onlyDigits)
  .refine((d) => d.length === 8, 'CEP incompleto')

// "dd/mm/aaaa" digitado → "AAAA-MM-DD".
export const zDateBr = z
  .string()
  .min(1, 'Informe a data')
  .transform((v, ctx) => {
    const iso = dateInputToIso(v)
    if (!iso) {
      ctx.addIssue({ code: 'custom', message: 'Data inválida' })
      return z.NEVER
    }
    return iso
  })

// "1,99" → 199 centavos.
export const zMoney = z.string().transform((v, ctx) => {
  const cents = v.trim() === '' ? null : parseMoneyToCents(v)
  if (cents === null) {
    ctx.addIssue({ code: 'custom', message: 'Valor inválido. Exemplo: 1,99' })
    return z.NEVER
  }
  return cents
})

// Link opcional: vazio vale; se vier, precisa ser https.
export const zOptionalHttps = (message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === '' || /^https:\/\/\S+\.\S+/.test(v), message)

// Número digitado em <input>: string → inteiro dentro da faixa.
export const zIntString = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, message)
    .transform(Number)
    .refine((n) => n >= min && n <= max, message)
