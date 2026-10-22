const pad = (n: number) => String(n).padStart(2, '0')

// Data local no formato dos campos de data e hora: "AAAA-MM-DDTHH:mm".
export const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

// Próximo dia da semana (0 = domingo) no horário dado; se hoje já passou do horário, pula uma semana.
export function nextWeekdayAt(weekday: number, time: string, from = new Date()) {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(from)
  d.setHours(h, m, 0, 0)
  let add = (weekday - d.getDay() + 7) % 7
  if (add === 0 && d <= from) add = 7
  d.setDate(d.getDate() + add)
  return toLocalInput(d)
}

// A Loteria Federal sorteia às quartas e aos sábados, às 19h (Brasília).
export const isLotteryDay = (local: string) => {
  const day = new Date(local).getDay()
  return day === 3 || day === 6
}

export const nextLotteryDraws = () => [
  { label: 'Próxima quarta, 19h', value: () => nextWeekdayAt(3, '19:00') },
  { label: 'Próximo sábado, 19h', value: () => nextWeekdayAt(6, '19:00') },
]
