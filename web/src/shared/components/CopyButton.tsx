import { CheckIcon, CopyIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from './Button'

type Props = {
  text: string
  label?: string
  copiedLabel?: string
  variant?: 'buy' | 'primary' | 'secondary' | 'ghost'
  className?: string
  // Navegador sem permissão de área de transferência: quem chama pode selecionar o texto à mão.
  onFail?: () => void
}

export function CopyButton({ text, label = 'Copiar', copiedLabel = 'Copiado', variant = 'secondary', className, onFail }: Props) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      onFail?.()
      return
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <Button type="button" variant={variant} className={className} onClick={copy}>
      {copied ? <CheckIcon weight="bold" className="size-4.5" /> : <CopyIcon weight="bold" className="size-4.5" />}
      {copied ? copiedLabel : label}
    </Button>
  )
}
