import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { cn } from '@/shared/utils/cn'
import { Button } from './Button'
import { Skeleton } from './Skeleton'

export function Table({ className, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full border-collapse text-left text-sm', className)} {...rest} />
    </div>
  )
}

export function TableHeader({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        'border-b border-cream-200 bg-cream-100/60 text-[11px] font-bold tracking-wider text-slate-grey-600 uppercase',
        className,
      )}
      {...rest}
    />
  )
}

export function TableBody({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-cream-200/80 bg-white', className)} {...rest} />
}

export function TableRow({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('group transition-colors hover:bg-cream-50/90', className)} {...rest} />
}

export function TableHead({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('px-5 py-3.5 font-semibold whitespace-nowrap', className)} {...rest} />
}

export function TableCell({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-5 py-4 align-middle', className)} {...rest} />
}

export type ColumnDef<T> = {
  key: string
  header: ReactNode
  className?: string
  cell: (row: T) => ReactNode
}

type DataTableProps<T> = {
  columns: ColumnDef<T>[]
  data?: T[]
  keyExtractor: (row: T) => string
  onRowClick?: (row: T) => void
  isLoading?: boolean
  skeletonRows?: number
  emptyState?: ReactNode
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  isLoading,
  skeletonRows = 5,
  emptyState,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-2xs">
        <Table>
          <TableHeader>
            <tr>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </tr>
          </TableHeader>
          <TableBody>
            {Array.from({ length: skeletonRows }).map((_, rIdx) => (
              <TableRow key={rIdx}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    <Skeleton className="h-5 w-full max-w-44" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return <>{emptyState}</>
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-2xs">
      <Table>
        <TableHeader>
          <tr>
            {columns.map((col) => (
              <TableHead key={col.key} className={col.className}>
                {col.header}
              </TableHead>
            ))}
          </tr>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={keyExtractor(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'cursor-pointer' : undefined}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function Pagination({
  page,
  pages,
  onPageChange,
}: {
  page: number
  pages: number
  onPageChange: (next: number) => void
}) {
  if (pages <= 1) return null
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <CaretLeftIcon className="size-4" />
        Anterior
      </Button>
      <span className="text-xs font-semibold text-slate-grey-600">
        Página <strong className="text-charcoal-900">{page}</strong> de {pages}
      </span>
      <Button variant="secondary" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
        Próxima
        <CaretRightIcon className="size-4" />
      </Button>
    </div>
  )
}
