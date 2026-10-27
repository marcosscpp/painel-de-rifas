export type DrawInput = { contest: string; prizes: string[] }

// Resultado buscado na Caixa: date em "AAAA-MM-DD".
export type FederalResult = { contest: string; date: string; prizes: string[] }

export type DrawStep = {
  prize: number // posição do prêmio (1 a 5)
  candidate: number
  candidateLabel: string
  outcome: 'winner' | 'out-of-range' | 'not-sold' | 'skipped'
}

// Prévia e publicação devolvem o mesmo formato.
export type DrawOutcome = {
  raffle: { id: string; title: string; totalNumbers: number }
  digits: number
  method: 'prize' | 'none' // 'none': nenhum prêmio caiu num número vendido, sem ganhador
  steps: DrawStep[]
  winningNumber: number | null
  winningLabel: string | null
  explanation: string
  winner: {
    orderId: string
    name: string
    phone: string | null
    phoneMasked: string | null
    city: string | null
    state: string | null
  } | null
}

export type DrawRaffle = {
  id: string
  slug: string
  title: string
  status: 'CLOSED' | 'DRAWN'
  totalNumbers: number
  drawDate: string | null
  progress: { paid: number }
}
