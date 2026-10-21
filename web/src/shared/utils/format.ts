const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

// Valores trafegam em centavos (inteiro) para não ter erro de arredondamento.
export const formatCents = (cents: number) => brl.format(cents / 100)

export const formatDateTime = (iso: string | Date) => dateTime.format(new Date(iso))

export const formatPhone = (digits: string) =>
  digits.replace(/\D/g, '').replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')

// Número da rifa com zeros à esquerda (ex.: 0042 numa rifa de 10.000 números).
export const padNumber = (n: number, total: number) => String(n).padStart(String(total - 1).length, '0')
