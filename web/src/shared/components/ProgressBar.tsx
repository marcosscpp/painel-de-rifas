export function ProgressBar({ percent, label }: { percent: number; label?: string }) {
  const value = Math.max(0, Math.min(100, percent))
  return (
    <div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${value}%` }} />
      </div>
      {label && <p className="mt-1 text-xs text-gray-600">{label}</p>}
    </div>
  )
}
