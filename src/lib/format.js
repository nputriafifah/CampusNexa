/** Round float noise from DB / JS math (e.g. 18.499999999999993). */
export function formatKg(n, { unit = true } = {}) {
  const num = Math.round((Number(n) || 0) * 10) / 10
  const text = Number.isInteger(num)
    ? num.toLocaleString('id-ID')
    : num.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return unit ? `${text} kg` : text
}

/** CO₂e avoided — e.g. "3.423 kg CO₂e dihindari" */
export function formatCo2Avoided(n) {
  const num = Math.round((Number(n) || 0) * 10) / 10
  const text = Number.isInteger(num)
    ? num.toLocaleString('id-ID')
    : num.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return `${text} kg CO₂e dihindari`
}

const EN_AGO = [
  [/just now/i, () => 'Baru saja'],
  [/an? few seconds ago/i, () => 'Baru saja'],
  [/(\d+)\s*seconds? ago/i, (_, n) => `${n} detik lalu`],
  [/an? minute ago/i, () => '1 menit lalu'],
  [/(\d+)\s*minutes? ago/i, (_, n) => `${n} menit lalu`],
  [/an? hour ago/i, () => '1 jam lalu'],
  [/(\d+)\s*hours? ago/i, (_, n) => `${n} jam lalu`],
  [/yesterday/i, () => 'Kemarin'],
  [/an? day ago/i, () => '1 hari lalu'],
  [/(\d+)\s*days? ago/i, (_, n) => `${n} hari lalu`],
  [/an? week ago/i, () => '1 minggu lalu'],
  [/(\d+)\s*weeks? ago/i, (_, n) => `${n} minggu lalu`],
  [/an? month ago/i, () => '1 bulan lalu'],
  [/(\d+)\s*months? ago/i, (_, n) => `${n} bulan lalu`],
]

/** Relatif waktu dalam Bahasa Indonesia (ISO atau teks Inggris Carbon). */
export function formatTimeAgo(value) {
  if (value == null || value === '') return 'Baru saja'
  const raw = String(value).trim()
  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime()) && /\d{4}-\d{2}/.test(raw)) {
    const sec = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 1000))
    if (sec < 45) return 'Baru saja'
    const min = Math.floor(sec / 60)
    if (min < 60) return `${min} menit lalu`
    const hours = Math.floor(min / 60)
    if (hours < 24) return `${hours} jam lalu`
    const days = Math.floor(hours / 24)
    if (days === 1) return 'Kemarin'
    if (days < 7) return `${days} hari lalu`
    if (days < 30) return `${Math.floor(days / 7)} minggu lalu`
    return parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  for (const [re, to] of EN_AGO) {
    const m = raw.match(re)
    if (m) return to(m[0], m[1])
  }
  return raw
    .replace(/\s+yang lalu$/i, ' lalu')
    .replace(/\bhours?\b/gi, 'jam')
    .replace(/\bminutes?\b/gi, 'menit')
    .replace(/\bdays?\b/gi, 'hari')
}

export function sustainabilityScore(impact = {}, borrowedCount = 0) {
  return Math.round(
    Number(impact.itemsSaved || 0) * 100 +
      Number(impact.foodRescuedKg || 0) * 40 +
      Number(impact.wasteReducedKg || 0) * 30 +
      borrowedCount * 50 +
      Number(impact.moneySaved || 0) / 100,
  )
}

export function greenLevel(score) {
  if (score >= 4000) return 'Green Champion'
  if (score >= 1500) return 'Green Explorer'
  if (score >= 300) return 'Green Starter'
  return 'Pemula hijau'
}
