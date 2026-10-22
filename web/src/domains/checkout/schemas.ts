import { z } from 'zod'
import { ageFromIso, onlyDigits, zCpf, zDateBr, zEmail, zFullName, zPhone, zRequired, zZip } from '@/shared/lib/validators'
import type { AddressInput, BuyerInput } from './types'

// Endereço como é digitado (todos os campos texto, vazios quando a pessoa não quer informar).
export const addressDraftSchema = z.object({
  zipCode: z.string(),
  street: z.string(),
  number: z.string(),
  district: z.string(),
  city: z.string(),
  state: z.string(),
  complement: z.string(),
  reference: z.string(),
})
export type AddressDraft = z.input<typeof addressDraftSchema>

// Endereço completo: o básico é obrigatório; complemento e referência não.
export const addressSchema = z
  .object({
    zipCode: zZip,
    street: zRequired('a rua').max(120),
    number: zRequired('o número').max(10, 'Até 10 caracteres'),
    district: zRequired('o bairro').max(80),
    city: zRequired('a cidade').max(80),
    state: z.string().length(2, 'Escolha a UF'),
    complement: z.string().trim().max(80),
    reference: z.string().trim().max(120),
  })
  .transform(
    ({ complement, reference, ...a }): AddressInput => ({
      ...a,
      ...(complement && { complement }),
      ...(reference && { reference }),
    }),
  )

// Valida o endereço só quando a pessoa marcou "informar endereço" e repassa os erros para os campos.
export function parseOptionalAddress(wants: boolean, address: AddressDraft, ctx: z.RefinementCtx) {
  if (!wants) return undefined
  const r = addressSchema.safeParse(address)
  if (r.success) return r.data
  for (const issue of r.error.issues) ctx.addIssue({ code: 'custom', message: issue.message, path: ['address', ...issue.path] })
  return undefined
}

// Cadastro do comprador (checkout e "Cadastrar"), com os campos do Wesley Alemão.
// A idade mínima vem das configurações do site.
export const buyerSchema = (minAge: number) =>
  z
    .object({
      name: zFullName,
      socialName: z.string().trim().max(80),
      showSocialName: z.boolean(),
      email: zEmail,
      phone: zPhone,
      phoneConfirm: z.string().transform(onlyDigits),
      birthDate: zDateBr.refine((iso) => ageFromIso(iso) >= minAge, `Venda permitida apenas para maiores de ${minAge} anos`),
      cpf: zCpf,
      wantsAddress: z.boolean(),
      address: addressDraftSchema,
      accepted: z.boolean().refine((v) => v, 'Confirme para continuar'),
    })
    .superRefine((v, ctx) => {
      if (v.phoneConfirm !== v.phone) {
        ctx.addIssue({ code: 'custom', path: ['phoneConfirm'], message: 'Os dois celulares não são iguais' })
      }
      parseOptionalAddress(v.wantsAddress, v.address, ctx)
    })
    .transform(
      (v, ctx): BuyerInput => ({
        name: v.name,
        ...(v.showSocialName && v.socialName && { socialName: v.socialName }),
        phone: v.phone,
        phoneConfirm: v.phoneConfirm,
        cpf: v.cpf,
        birthDate: v.birthDate,
        email: v.email,
        ...(v.wantsAddress && { address: parseOptionalAddress(true, v.address, ctx) }),
      }),
    )

export type BuyerFormValues = z.input<ReturnType<typeof buyerSchema>>
