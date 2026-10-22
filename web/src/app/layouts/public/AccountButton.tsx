import { SignInIcon } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { useBuyerSession } from '@/domains/checkout'

// Canto direito do cabeçalho: "Olá, Nome" quando o comprador está logado, senão "Entrar".
export function AccountButton() {
  const buyer = useBuyerSession().data

  if (!buyer) {
    return (
      <Link
        to="/entrar"
        className="group flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-center transition hover:bg-watercourse-900"
      >
        <SignInIcon className="size-5 text-cream-100 transition group-hover:text-anzac-400" />
        <span className="text-[11px] font-bold text-anzac-400">Entrar</span>
      </Link>
    )
  }

  return (
    <Link
      to="/meus-numeros"
      className="flex items-center gap-2 rounded-xl px-2 py-1 transition hover:bg-watercourse-900"
      aria-label={`Minha conta: ${buyer.name}`}
    >
      <span className="gold-gradient flex size-8 items-center justify-center rounded-full text-sm font-extrabold text-charcoal-950">
        {buyer.name.charAt(0).toUpperCase()}
      </span>
      <span className="hidden flex-col text-left leading-tight sm:flex">
        <span className="text-[10px] text-cream-200/70">Olá,</span>
        <span className="max-w-24 truncate text-xs font-bold text-anzac-400">{buyer.name}</span>
      </span>
    </Link>
  )
}
