import { cn } from '@/shared/utils/cn'

// O cn só junta classes (não resolve conflito do Tailwind). Por isso o que pode variar
// (tamanho e cor de erro) não fica na base: vem de fieldSizes e fieldTone, e a largura
// do campo é definida no invólucro (wrapperClassName), nunca no próprio controle.
export const fieldControlBase =
  'w-full rounded-xl border bg-cream-50 text-charcoal-900 outline-none transition placeholder:text-slate-grey-400 focus:bg-white focus:ring-2 disabled:cursor-not-allowed disabled:bg-cream-200/50 disabled:text-slate-grey-500'

export type FieldSize = 'sm' | 'md' | 'lg'

export const fieldSizes: Record<FieldSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-3.5 py-2.5 text-sm',
  // Mesma altura dos botões quadrados (size-11), com o número em destaque.
  lg: 'h-11 px-3 text-lg',
}

export const fieldTone = (error?: string) =>
  error
    ? 'border-error-500 focus:border-error-600 focus:ring-error-500/30'
    : 'border-cream-300 focus:border-watercourse-700 focus:ring-anzac-400/45'

export const fieldControl = (size: FieldSize, error?: string) => cn(fieldControlBase, fieldSizes[size], fieldTone(error))

// Ícone à esquerda: cinza parado e teal quando o campo está em foco (o pai precisa de "group").
export const fieldIcon =
  'pointer-events-none absolute left-3.5 flex items-center text-slate-grey-400 transition-colors group-focus-within:text-watercourse-700'
