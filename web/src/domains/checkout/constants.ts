import type { BuyerDraft } from './types'

export const emptyBuyer: BuyerDraft = {
  name: '',
  socialName: '',
  showSocialName: false,
  email: '',
  phone: '',
  phoneConfirm: '',
  birthDate: '',
  cpf: '',
  wantsAddress: false,
  address: { zipCode: '', street: '', number: '', district: '', city: '', state: '', complement: '', reference: '' },
  accepted: false,
}

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]
