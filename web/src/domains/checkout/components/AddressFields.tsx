import { useState } from 'react'
import { Input, Select } from '@/shared/components'
import { maskZipInput } from '@/shared/utils/format'
import { UFS } from '../constants'
import { buyerApi } from '../services/buyer.api'
import type { BuyerDraft } from '../types'

type Address = BuyerDraft['address']

const ufOptions = [{ value: '', label: '--' }, ...UFS.map((uf) => ({ value: uf, label: uf }))]

// Endereço do comprador com busca pelo CEP (ViaCEP via API). Usado no checkout e em "Meus dados".
export function AddressFields({ value, onChange }: { value: Address; onChange: (v: Address) => void }) {
  const [cepState, setCepState] = useState<'idle' | 'loading' | 'error'>('idle')
  const set = (patch: Partial<Address>) => onChange({ ...value, ...patch })

  const lookupCep = async (masked: string) => {
    set({ zipCode: masked })
    const cep = masked.replace(/\D/g, '')
    if (cep.length !== 8) return
    setCepState('loading')
    try {
      const a = await buyerApi.cep(cep)
      onChange({ ...value, zipCode: masked, street: a.street, district: a.district, city: a.city, state: a.state })
      setCepState('idle')
    } catch {
      setCepState('error')
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-cream-200 bg-cream-100/50 p-3">
      <Input
        label="CEP"
        required
        inputMode="numeric"
        placeholder="00000-000"
        value={value.zipCode}
        hint={cepState === 'loading' ? 'Buscando endereço…' : undefined}
        error={cepState === 'error' ? 'CEP não encontrado. Preencha à mão.' : undefined}
        onChange={(e) => void lookupCep(maskZipInput(e.target.value))}
      />
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <Input label="Rua ou avenida" required value={value.street} onChange={(e) => set({ street: e.target.value })} />
        <Input label="Número" required placeholder="123 ou S/N" value={value.number} onChange={(e) => set({ number: e.target.value })} />
      </div>
      <Input label="Bairro" required value={value.district} onChange={(e) => set({ district: e.target.value })} />
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <Input label="Cidade" required value={value.city} onChange={(e) => set({ city: e.target.value })} />
        <Select label="UF" required value={value.state} onChange={(e) => set({ state: e.target.value })} options={ufOptions} />
      </div>
      <Input
        label="Complemento (opcional)"
        placeholder="Apartamento, bloco, casa…"
        value={value.complement}
        onChange={(e) => set({ complement: e.target.value })}
      />
      <Input label="Ponto de referência (opcional)" value={value.reference} onChange={(e) => set({ reference: e.target.value })} />
    </div>
  )
}
