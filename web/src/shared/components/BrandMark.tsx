import { useSiteName } from '@/shared/hooks/useSiteSettings'
import { cn } from '@/shared/utils/cn'

type Props = {
  name?: string
  subtitle?: string
  tone?: 'light' | 'dark'
  size?: 'sm' | 'md'
  className?: string
}

// Logo WinClub: ícone + nome em SVG (web/public/brand). Fontes da marca em docs/marca/.
// O desenho do nome é fixo (SVG); o texto (alt) usa o nome configurado em Configurações.
export function BrandMark({ name, subtitle, tone = 'light', size = 'md', className }: Props) {
  const siteName = useSiteName()
  const isDark = tone === 'dark'
  return (
    <span className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <img
        src="/brand/icone.svg"
        alt=""
        aria-hidden
        className={cn(
          'shrink-0 transition-transform group-hover:scale-105',
          size === 'sm' ? 'size-8' : 'size-10',
        )}
      />
      <span className="flex flex-col leading-none">
        <img
          src={isDark ? '/brand/nome-sem-slogan-fundo-escuro.svg' : '/brand/nome-sem-slogan.svg'}
          alt={name ?? siteName}
          className={cn('w-auto', size === 'sm' ? 'h-3.5' : 'h-[18px]')}
        />
        {subtitle && (
          <span
            className={cn(
              'mt-1 text-[10px] font-semibold tracking-widest uppercase',
              isDark ? 'text-anzac-300/90' : 'text-anzac-700',
            )}
          >
            {subtitle}
          </span>
        )}
      </span>
    </span>
  )
}
