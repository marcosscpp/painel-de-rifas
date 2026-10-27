import { createContext, type ReactNode } from 'react'

export type ConfirmOptions = {
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'primary' | 'danger'
}

export type AlertOptions = {
  title: string
  message: ReactNode
  okLabel?: string
}

export type DialogApi = {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  alert: (options: AlertOptions) => Promise<void>
}

export const DialogContext = createContext<DialogApi | null>(null)
