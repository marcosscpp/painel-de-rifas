import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import type { Icon } from '@phosphor-icons/react'
import { cn } from '@/shared/utils/cn'

// Aba do cabeçalho (Campanhas | Meus números | Ganhadores).
export function HeaderTab({ to, end, icon: IconCmp, label }: { to: string; end?: boolean; icon: Icon; label: string }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center justify-center gap-1 rounded-xl border py-2 text-xs font-semibold transition',
          isActive
            ? 'border-anzac-400 bg-watercourse-900/90 text-cream-50 shadow-2xs'
            : 'border-watercourse-800/90 bg-watercourse-900/30 text-cream-200/75 hover:border-watercourse-700 hover:text-cream-50',
        )
      }
    >
      {({ isActive }) => (
        <>
          <IconCmp weight={isActive ? 'fill' : 'regular'} className={cn('size-4', isActive ? 'text-anzac-400' : 'text-cream-200/70')} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}

const menuLinkClass =
  'flex w-full items-center gap-3 rounded-xl border border-watercourse-800/90 bg-watercourse-900/40 px-4 py-3.5 text-left text-sm font-semibold text-cream-100 transition hover:border-anzac-400/50 hover:bg-watercourse-900'

// Item do menu de tela cheia: link interno, âncora ou botão (ex.: Sair).
export function MenuItem({
  icon: IconCmp,
  label,
  to,
  href,
  onClick,
}: {
  icon: Icon
  label: string
  to?: string
  href?: string
  onClick: () => void
}) {
  const content = (
    <>
      <IconCmp className="size-5 text-anzac-400" />
      {label}
    </>
  )
  if (to)
    return (
      <NavLink to={to} onClick={onClick} className={menuLinkClass}>
        {content}
      </NavLink>
    )
  if (href)
    return (
      <a href={href} onClick={onClick} className={menuLinkClass}>
        {content}
      </a>
    )
  return (
    <button type="button" onClick={onClick} className={cn(menuLinkClass, 'cursor-pointer')}>
      {content}
    </button>
  )
}

export function MenuSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="px-1 text-[11px] font-bold tracking-wider text-cream-200/50 uppercase">{title}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}
