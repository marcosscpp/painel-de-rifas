import { useContext } from 'react'
import { type DialogApi, DialogContext } from '@/shared/lib/dialog-context'

function useDialog(): DialogApi {
  const api = useContext(DialogContext)
  if (!api) throw new Error('useConfirm/useAlert precisam estar dentro de <DialogProvider>')
  return api
}

// Substitui o window.confirm: `if (await confirm({ title, message })) ...`
export const useConfirm = () => useDialog().confirm

// Substitui o window.alert: `await alert({ title, message })`
export const useAlert = () => useDialog().alert
