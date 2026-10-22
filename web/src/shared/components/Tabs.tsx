import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { cn } from '@/shared/utils/cn'

export type TabItem<T extends string = string> = { value: T; label: string; icon?: ReactNode; count?: number }

const tabClass = (active: boolean) =>
  cn(
    'inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold whitespace-nowrap transition sm:text-sm',
    active ? 'bg-watercourse-900 text-cream-50 shadow-xs' : 'text-slate-grey-700 hover:bg-cream-200/70 hover:text-charcoal-900',
  )

function Content({ item }: { item: TabItem }) {
  return (
    <>
      {item.icon}
      {item.label}
      {item.count !== undefined && (
        <span className="rounded-md bg-anzac-400 px-1.5 text-[10px] font-extrabold text-charcoal-950">{item.count}</span>
      )}
    </>
  )
}

// Abas em "pílula" controladas por estado (filtros de status, seções da mesma tela).
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem<T>[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div role="tablist" className={cn('flex gap-1 overflow-x-auto rounded-xl border border-cream-200 bg-cream-50 p-1', className)}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={item.value === value}
          onClick={() => onChange(item.value)}
          className={tabClass(item.value === value)}
        >
          <Content item={item} />
        </button>
      ))}
    </div>
  )
}

// Mesmas abas, mas cada uma é uma rota (ex.: Meus números / Meus dados).
export function NavTabs({ items, className }: { items: (TabItem & { to: string; end?: boolean })[]; className?: string }) {
  return (
    <nav className={cn('flex gap-1 overflow-x-auto rounded-xl border border-cream-200 bg-cream-50 p-1', className)}>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => tabClass(isActive)}>
          <Content item={item} />
        </NavLink>
      ))}
    </nav>
  )
}
