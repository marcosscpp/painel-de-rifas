import { CalendarBlankIcon } from '@phosphor-icons/react'
import { cn } from '@/shared/utils/cn'
import { Input, type InputProps } from './Input'

type Props = Omit<InputProps, 'type' | 'leftIcon'>

// Data (AAAA-MM-DD) com o ícone da casa no lugar do indicador nativo, que muda de navegador
// para navegador; clicar em qualquer ponto do campo abre o calendário.
export function DateField({ className, onClick, ...props }: Props) {
  return (
    <Input
      {...props}
      type="date"
      leftIcon={<CalendarBlankIcon weight="duotone" className="size-4" />}
      onClick={(e) => {
        ;(e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.()
        onClick?.(e)
      }}
      className={cn('[&::-webkit-calendar-picker-indicator]:hidden', className)}
    />
  )
}
