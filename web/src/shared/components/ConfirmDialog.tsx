import type { ReactNode } from 'react'
import { Alert } from './Alert'
import { Button } from './Button'
import { Modal } from './Modal'

type Props = {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  tone?: 'primary' | 'danger'
  loading?: boolean
  error?: string
  onConfirm: () => void
  onClose: () => void
}

// Confirmação de ação que não tem volta (cancelar pedido, publicar resultado).
export function ConfirmDialog({ open, title, children, confirmLabel, tone = 'primary', loading, error, onConfirm, onClose }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      busy={loading}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Voltar
          </Button>
          <Button variant={tone} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 text-sm text-slate-grey-700">
        {children}
        {error && <Alert tone="error">{error}</Alert>}
      </div>
    </Modal>
  )
}
