import { type ChangeEvent, useRef } from 'react'
import { Button } from './Button'

const MB = 1024 * 1024

type Props = {
  label: string
  onPick: (files: File[]) => void
  onReject?: (message: string) => void
  multiple?: boolean
  loading?: boolean
  disabled?: boolean
  maxBytes?: number
  accept?: string
}

// Botão que abre o seletor de arquivo. Recusa arquivo grande antes de enviar
// (o servidor valida de novo tamanho e conteúdo).
export function FilePickerButton({
  label,
  onPick,
  onReject,
  multiple,
  loading,
  disabled,
  maxBytes = 8 * MB,
  accept = 'image/jpeg,image/png,image/webp,image/avif',
}: Props) {
  const ref = useRef<HTMLInputElement>(null)

  const change = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // permite escolher o mesmo arquivo de novo
    const tooBig = files.filter((f) => f.size > maxBytes)
    if (tooBig.length) {
      onReject?.(`Arquivo acima de ${maxBytes / MB} MB: ${tooBig.map((f) => f.name).join(', ')}`)
    }
    const ok = files.filter((f) => f.size <= maxBytes)
    if (ok.length) onPick(ok)
  }

  return (
    <>
      <input ref={ref} type="file" hidden accept={accept} multiple={multiple} onChange={change} />
      <Button type="button" variant="secondary" loading={loading} disabled={disabled} onClick={() => ref.current?.click()}>
        {label}
      </Button>
    </>
  )
}
