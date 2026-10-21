import { EmptyState, PageHeader } from '@/shared/components'

// QR Code e copia e cola do Pix, contagem de 15 minutos e confirmação em tempo real.
export function CheckoutPage() {
  return (
    <>
      <PageHeader title="Pagamento" />
      <EmptyState title="Em construção" description="QR Code e copia e cola do Pix, contagem de 15 minutos e confirmação em tempo real." />
    </>
  )
}
