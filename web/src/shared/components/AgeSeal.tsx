import { cn } from '@/shared/utils/cn'

// Selo de idade mínima (vem das configurações do site).
export function AgeSeal({ age, className }: { age: number; className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2.5 rounded-full border border-cream-300 bg-cream-50 px-4 py-1.5 shadow-2xs',
        className,
      )}
    >
      <span className="rounded-md bg-charcoal-900 px-2 py-0.5 text-xs font-extrabold text-cream-50">{age}+</span>
      <span className="text-xs font-medium text-slate-grey-600">Permitido para maiores de {age} anos</span>
    </div>
  )
}
