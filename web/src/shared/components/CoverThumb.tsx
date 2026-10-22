import { TicketIcon } from '@phosphor-icons/react'
import type { ImageUrls } from '@/shared/types'
import { cn } from '@/shared/utils/cn'

const sizes = {
  sm: 'h-12 w-18 rounded-lg',
  md: 'h-14 w-20 rounded-lg',
  lg: 'h-16 w-24 rounded-xl',
}

// Miniatura da capa da campanha, ou um bloco com a cor da marca quando não há capa.
export function CoverThumb({ cover, size = 'md', className }: { cover: ImageUrls | null; size?: keyof typeof sizes; className?: string }) {
  if (cover) return <img src={cover.thumb} alt="" className={cn('shrink-0 object-cover', sizes[size], className)} />
  return (
    <div className={cn('royal-gradient flex shrink-0 items-center justify-center text-anzac-300', sizes[size], className)}>
      <TicketIcon weight="duotone" className="size-6" />
    </div>
  )
}
