import { CalendarBlankIcon, ClockIcon, XIcon } from '@phosphor-icons/react'
import { useId } from 'react'
import { cn } from '@/shared/utils/cn'
import { FieldWrap, fieldControlBase } from './Field'

export type DateTimePreset = { label: string; value: () => string }

type Props = {
  label: string
  // Valor local "AAAA-MM-DDTHH:mm" (mesmo formato do datetime-local); '' quando vazio.
  value: string
  onChange: (value: string) => void
  hint?: string
  error?: string
  disabled?: boolean
  defaultTime?: string
  presets?: DateTimePreset[]
}

// Data e hora em campos separados: o datetime-local nativo muda muito de navegador para navegador
// e é ruim de usar no celular. Mantém o mesmo formato de valor para não mudar quem usa.
export function DateTimeField({ label, value, onChange, hint, error, disabled, defaultTime = '19:00', presets }: Props) {
  const id = useId()
  const [date, time] = value ? value.split('T') : ['', '']

  const setDate = (d: string) => onChange(d ? `${d}T${time || defaultTime}` : '')
  const setTime = (t: string) => date && onChange(`${date}T${t || defaultTime}`)
  const border = error ? 'border-error-500 focus:border-error-600 focus:ring-error-500/30' : 'border-cream-300'

  return (
    <FieldWrap label={label} error={error} hint={hint} id={id}>
      <div className="flex gap-2">
        <div className="relative flex flex-1 items-center">
          <CalendarBlankIcon weight="duotone" className="pointer-events-none absolute left-3.5 size-4 text-slate-grey-500" />
          <input
            id={id}
            type="date"
            value={date}
            disabled={disabled}
            aria-invalid={!!error}
            onChange={(e) => setDate(e.target.value)}
            onClick={(e) => (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.()}
            className={cn(fieldControlBase, border, 'pl-10 [&::-webkit-calendar-picker-indicator]:hidden')}
          />
        </div>
        <div className="relative flex w-32 items-center">
          <ClockIcon weight="duotone" className="pointer-events-none absolute left-3.5 size-4 text-slate-grey-500" />
          <input
            type="time"
            aria-label={`${label}: horário`}
            value={time}
            disabled={disabled || !date}
            onChange={(e) => setTime(e.target.value)}
            className={cn(fieldControlBase, border, 'pl-10 [&::-webkit-calendar-picker-indicator]:hidden')}
          />
        </div>
        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={`Limpar ${label.toLowerCase()}`}
            className="shrink-0 rounded-xl border border-cream-300 px-3 text-slate-grey-500 transition hover:bg-cream-100 hover:text-error-600"
          >
            <XIcon weight="bold" className="size-4" />
          </button>
        )}
      </div>
      {presets && !disabled && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.value())}
              className="rounded-lg bg-watercourse-50 px-2.5 py-1 text-xs font-semibold text-watercourse-800 ring-1 ring-watercourse-200 transition ring-inset hover:bg-watercourse-100"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </FieldWrap>
  )
}
