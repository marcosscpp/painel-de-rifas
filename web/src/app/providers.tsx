import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router'
import { DialogProvider } from '@/shared/components'
import { queryClient } from '@/shared/lib/query-client'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <DialogProvider>{children}</DialogProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
