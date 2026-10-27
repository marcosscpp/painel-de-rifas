import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react'
import { type AlertOptions, type ConfirmOptions, type DialogApi, DialogContext } from '@/shared/lib/dialog-context'
import { Button } from './Button'
import { Modal } from './Modal'

type Current =
  | { kind: 'confirm'; options: ConfirmOptions }
  | { kind: 'alert'; options: AlertOptions }

// Um diálogo por vez no estilo da marca, aberto pelos hooks useConfirm/useAlert.
// Cada chamada devolve uma Promise que resolve quando a pessoa responde.
export function DialogProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Current | null>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const open = useCallback((next: Current) => {
    // Se outro diálogo estava aberto, ele conta como cancelado.
    resolver.current?.(false)
    setCurrent(next)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = useCallback((value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setCurrent(null)
  }, [])

  const api = useMemo<DialogApi>(
    () => ({
      confirm: (options) => open({ kind: 'confirm', options }),
      alert: async (options) => {
        await open({ kind: 'alert', options })
      },
    }),
    [open],
  )

  const cancel = useCallback(() => close(false), [close])

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal
        open={current !== null}
        onClose={cancel}
        title={current?.options.title ?? ''}
        footer={
          current && (
            <div className="flex justify-end gap-2">
              {current.kind === 'confirm' ? (
                <>
                  <Button variant="ghost" onClick={cancel}>
                    {current.options.cancelLabel ?? 'Voltar'}
                  </Button>
                  <Button variant={current.options.tone ?? 'primary'} onClick={() => close(true)}>
                    {current.options.confirmLabel ?? 'Confirmar'}
                  </Button>
                </>
              ) : (
                <Button onClick={() => close(true)}>{current.options.okLabel ?? 'Entendi'}</Button>
              )}
            </div>
          )
        }
      >
        <div className="text-sm whitespace-pre-line text-slate-grey-700">{current?.options.message}</div>
      </Modal>
    </DialogContext.Provider>
  )
}
