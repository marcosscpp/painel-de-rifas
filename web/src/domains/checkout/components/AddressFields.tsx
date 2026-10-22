import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { Input, MaskedInput, Select } from '@/shared/components'
import { maskZipInput } from '@/shared/utils/format'
import { UFS } from '../constants'
import type { AddressDraft } from '../schemas'
import { buyerApi } from '../services/buyer.api'

const ufOptions = [{ value: '', label: '--' }, ...UFS.map((uf) => ({ value: uf, label: uf }))]

type WithAddress = { address: AddressDraft }

// Endereço do comprador com busca pelo CEP (ViaCEP via API). Fica dentro de um formulário
// React Hook Form que tenha o grupo "address" (checkout, Cadastrar e Meus dados).
export function AddressFields() {
  const { control, register, setValue, formState } = useFormContext<WithAddress>()
  const errors = formState.errors.address
  const [cepState, setCepState] = useState<'idle' | 'loading' | 'error'>('idle')

  const lookupCep = async (masked: string) => {
    const cep = masked.replace(/\D/g, '')
    if (cep.length !== 8) return
    setCepState('loading')
    try {
      const a = await buyerApi.cep(cep)
      const opts = { shouldValidate: true, shouldDirty: true }
      setValue('address.street', a.street, opts)
      setValue('address.district', a.district, opts)
      setValue('address.city', a.city, opts)
      setValue('address.state', a.state, opts)
      setCepState('idle')
    } catch {
      setCepState('error')
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-cream-200 bg-cream-100/50 p-3">
      <MaskedInput
        control={control}
        name="address.zipCode"
        mask={(v) => {
          const masked = maskZipInput(v)
          void lookupCep(masked)
          return masked
        }}
        label="CEP"
        inputMode="numeric"
        placeholder="00000-000"
        hint={cepState === 'loading' ? 'Buscando endereço…' : undefined}
        error={cepState === 'error' ? 'CEP não encontrado. Preencha à mão.' : undefined}
      />
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <Input label="Rua ou avenida" error={errors?.street?.message} {...register('address.street')} />
        <Input label="Número" placeholder="123 ou S/N" error={errors?.number?.message} {...register('address.number')} />
      </div>
      <Input label="Bairro" error={errors?.district?.message} {...register('address.district')} />
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <Input label="Cidade" error={errors?.city?.message} {...register('address.city')} />
        <Select label="UF" options={ufOptions} error={errors?.state?.message} {...register('address.state')} />
      </div>
      <Input label="Complemento (opcional)" placeholder="Apartamento, bloco, casa…" {...register('address.complement')} />
      <Input label="Ponto de referência (opcional)" {...register('address.reference')} />
    </div>
  )
}
