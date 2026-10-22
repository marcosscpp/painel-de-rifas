import { z } from 'zod'
import { addressDraftSchema, parseOptionalAddress, type ProfileInput } from '@/domains/checkout'
import { zEmail, zFullName } from '@/shared/lib/validators'

// "Meus dados": só o que a pessoa pode mudar sozinha. Sem endereço marcado, apaga o que havia.
export const profileSchema = z
  .object({
    name: zFullName,
    socialName: z.string().trim().max(80),
    email: zEmail,
    wantsAddress: z.boolean(),
    address: addressDraftSchema,
  })
  .transform(
    (v, ctx): ProfileInput => ({
      name: v.name,
      socialName: v.socialName,
      email: v.email,
      address: parseOptionalAddress(v.wantsAddress, v.address, ctx) ?? null,
    }),
  )
