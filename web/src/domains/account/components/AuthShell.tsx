import type { ReactNode } from 'react'
import { Card } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

// Moldura das telas "Entrar" e "Cadastrar".
export function AuthShell({ title, subtitle, icon, children, footer }: { title: string; subtitle: string; icon: ReactNode; children: ReactNode; footer?: ReactNode }) {
  useDocumentTitle(title)
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <Card className="overflow-hidden p-0">
        <div className="royal-gradient flex items-center gap-3 px-5 py-4 text-cream-50">
          <span className="gold-gradient flex size-10 items-center justify-center rounded-xl text-charcoal-950 shadow-xs">{icon}</span>
          <div>
            <h1 className="font-wide text-lg font-extrabold">{title}</h1>
            <p className="text-xs text-cream-200/80">{subtitle}</p>
          </div>
        </div>
        <div className="p-5">{children}</div>
      </Card>
      {footer && <div className="text-center text-sm text-slate-grey-700">{footer}</div>}
    </div>
  )
}
