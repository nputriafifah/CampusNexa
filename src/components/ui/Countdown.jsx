import { useEffect, useState } from 'react'
import { Clock, Flame } from 'lucide-react'

/** Format sisa waktu yang mudah dibaca juri / user (bukan "2j 34m 9d"). */
export function formatRemainingLabel(ms) {
  if (ms <= 0) return 'Waktu habis'
  const totalMin = Math.floor(ms / 60000)
  const days = Math.floor(totalMin / (60 * 24))
  const hours = Math.floor((totalMin % (60 * 24)) / 60)
  const mins = totalMin % 60

  if (days > 0) {
    if (hours > 0) return `${days} hari ${hours} jam`
    return `${days} hari`
  }
  if (hours > 0) {
    if (mins > 0) return `${hours} jam ${mins} menit`
    return `${hours} jam`
  }
  if (mins > 0) return `${mins} menit`
  return 'kurang dari 1 menit'
}

export function Countdown({
  until,
  className = '',
  /** 'sisa' → "Sisa 2 jam 34 menit" | 'berakhir' → "Berakhir dalam …" | 'plain' */
  mode = 'sisa',
  showIcon = true,
}) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const end = new Date(until).getTime()
  const left = end - now
  const expired = left <= 0
  const critical = !expired && left < 30 * 60 * 1000
  const urgent = !expired && left < 60 * 60 * 1000

  const label = expired
    ? 'Waktu habis'
    : mode === 'berakhir'
      ? `Berakhir dalam ${formatRemainingLabel(left)}`
      : mode === 'plain'
        ? formatRemainingLabel(left)
        : `Sisa ${formatRemainingLabel(left)}`

  const Icon = critical || urgent ? Flame : Clock

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold ${
        expired || critical
          ? 'text-red-600'
          : urgent
            ? 'text-amber-700'
            : 'text-[var(--forest)]'
      } ${className}`}
    >
      {showIcon && <Icon size={14} className="shrink-0" />}
      {label}
    </span>
  )
}
