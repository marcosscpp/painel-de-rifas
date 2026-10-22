// Monta "?a=1&b=2" ignorando vazios (filtros de lista, links de exportação).
export function toQuery(params: Record<string, string | number | boolean | null | undefined>) {
  const s = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '' && v !== false) s.set(k, String(v))
  }
  const str = s.toString()
  return str ? `?${str}` : ''
}
