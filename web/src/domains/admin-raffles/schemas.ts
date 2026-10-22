import { z } from 'zod'
import { zIntString, zMoney } from '@/shared/lib/validators'
import { localInputToIso } from '@/shared/utils/format'
import type { PrizeInput, RaffleInput } from './types'

const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/

// Dados da rifa. Datas chegam como "AAAA-MM-DDTHH:mm" (vazio = sem data).
export const raffleSchema = z
  .object({
    title: z.string().trim().min(3, 'Mínimo de 3 caracteres').max(120),
    slug: z.string().trim().refine((v) => v === '' || slugRegex.test(v), 'Use só letras minúsculas, números e hífen'),
    description: z.string().trim().min(1, 'Escreva uma descrição').max(10000),
    rules: z.string().trim().max(50000),
    saleMode: z.enum(['QUANTITY', 'PICK']),
    totalNumbers: zIntString(10, 1_000_000, 'De 10 a 1.000.000'),
    price: zMoney.refine((c) => c > 0, 'O preço precisa ser maior que zero'),
    minPerOrder: zIntString(1, 1_000_000, 'Mínimo de 1'),
    maxPerOrder: zIntString(1, 1_000_000, 'Mínimo de 1'),
    endsAt: z.string(),
    drawDate: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.maxPerOrder < v.minPerOrder) {
      ctx.addIssue({ code: 'custom', path: ['maxPerOrder'], message: 'Precisa ser maior ou igual ao mínimo' })
    }
    if (v.endsAt && v.drawDate && new Date(v.endsAt) > new Date(v.drawDate)) {
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'O fim das vendas precisa ser antes do sorteio.' })
    }
  })
  .transform(
    (v): RaffleInput => ({
      title: v.title,
      ...(v.slug && { slug: v.slug }),
      description: v.description,
      rules: v.rules,
      saleMode: v.saleMode,
      totalNumbers: v.totalNumbers,
      priceCents: v.price,
      minPerOrder: v.minPerOrder,
      maxPerOrder: v.maxPerOrder,
      endsAt: localInputToIso(v.endsAt),
      drawDate: localInputToIso(v.drawDate),
    }),
  )
export type RaffleFormValues = z.input<typeof raffleSchema>

// Prêmio: valor em reais é opcional.
export const prizeSchema = z
  .object({
    title: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(120),
    description: z.string().trim().max(2000),
    kind: z.enum(['ITEM', 'MONEY']),
    value: z.string(),
  })
  .transform((v, ctx): PrizeInput => {
    let valueCents: number | null = null
    if (v.value.trim()) {
      const r = zMoney.safeParse(v.value)
      if (!r.success) ctx.addIssue({ code: 'custom', path: ['value'], message: 'Valor inválido. Exemplo: 1.500,00' })
      else valueCents = r.data
    }
    return { title: v.title, description: v.description, kind: v.kind, valueCents }
  })
export type PrizeFormValues = z.input<typeof prizeSchema>

// Pacotes "+10", "+50": quantidades dentro do mínimo/máximo por pedido, sem repetir.
export const packagesSchema = (min: number, max: number) =>
  z
    .object({
      rows: z
        .array(z.object({ quantity: zIntString(min, max, `De ${min} a ${max}`), highlighted: z.boolean() }))
        .max(12, 'No máximo 12 pacotes'),
    })
    .superRefine((v, ctx) => {
      const seen = new Set<number>()
      v.rows.forEach((r, i) => {
        if (seen.has(r.quantity)) ctx.addIssue({ code: 'custom', path: ['rows', i, 'quantity'], message: 'Quantidade repetida' })
        seen.add(r.quantity)
      })
    })
