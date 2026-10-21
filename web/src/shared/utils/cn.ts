// Junta classes do Tailwind ignorando valores falsos.
export const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ')
