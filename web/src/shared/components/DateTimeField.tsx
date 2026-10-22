import { CalendarBlankIcon, ClockIcon, XIcon } from '@phosphor-icons/react'
import { useId } from 'react'
import { cn } from '@/shared/utils/cn'
import { FieldWrap } from './Field'
import { fieldControl, fieldIcon } from './field-styles'

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
  const control = cn(fieldControl('md', error), 'pl-10 [&::-webkit-calendar-picker-indicator]:hidden')

  return (
    <FieldWrap label={label} error={error} hint={hint} id={id}>
      <div className="flex gap-2">
        <div className="group relative flex flex-1 items-center">
          <span className={fieldIcon}>
            <CalendarBlankIcon weight="duotone" className="size-4" />
          </span>
          <input
            id={id}
            type="date"
            value={date}
            disabled={disabled}
            aria-invalid={!!error}
            onChange={(e) => setDate(e.target.value)}
            onClick={(e) => (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.()}
            className={control}
          />
        </div>
        <div className="group relative flex w-32 shrink-0 items-center">
          <span className={fieldIcon}>
            <ClockIcon weight="duotone" className="size-4" />
          </span>
          <input
            type="time"
            aria-label={`${label}: horário`}
            value={time}
            disabled={disabled || !date}
            onChange={(e) => setTime(e.target.value)}
            className={control}
          />
        </div>
        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={`Limpar ${label.toLowerCase()}`}
            className="shrink-0 rounded-xl border border-cream-300 px-3 text-slate-grey-500 transition outline-none hover:bg-cream-100 hover:text-error-600 focus-visible:ring-2 focus-visible:ring-anzac-400/45"
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
