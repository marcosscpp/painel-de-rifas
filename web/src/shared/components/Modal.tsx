import { XIcon } from '@phosphor-icons/react'
import { type ReactNode, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/shared/utils/cn'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  className?: string
  // Bloqueia fechar (Esc, clique fora, X) enquanto algo está sendo enviado.
  busy?: boolean
}

// Diálogo acessível: foco vai para dentro ao abrir e volta ao botão de origem ao fechar,
// Esc e clique no fundo fecham, a página atrás não rola. No celular ocupa a tela de baixo para cima.
export function Modal({ open, onClose, title, children, footer, className, busy }: Props) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])')?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
      if (e.key !== 'Tab' || !panel.current) return
      // Mantém o Tab dentro do diálogo.
      const items = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [open, onClose, busy])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        aria-hidden
        className="absolute inset-0 bg-charcoal-950/60 backdrop-blur-[2px]"
        onClick={() => !busy && onClose()}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-cream-50 shadow-2xl sm:max-w-md sm:rounded-2xl',
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-cream-200 px-5 py-4">
          <h2 id={titleId} className="font-wide text-lg font-bold text-charcoal-900">
            {title}
          </h2>
          <button
            type="button"
            data-close
            aria-label="Fechar"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-grey-600 transition hover:bg-cream-200 hover:text-charcoal-900 disabled:opacity-40"
          >
            <XIcon weight="bold" className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-cream-200 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
