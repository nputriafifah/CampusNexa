/** Insight AI + sustainability untuk halaman Food Rescue (FE demo). */

const SOURCE_MAP = [
  { id: 'bem', label: 'BEM', emoji: '🏫', keys: ['bem'] },
  { id: 'hima', label: 'HIMA', emoji: '🏫', keys: ['hima'] },
  { id: 'ukm', label: 'UKM', emoji: '🏫', keys: ['ukm'] },
  { id: 'kantin', label: 'Kantin', emoji: '🍽️', keys: ['kantin', 'cafe', 'warung'] },
  { id: 'seminar', label: 'Seminar', emoji: '🎤', keys: ['seminar', 'kuliah umum', 'workshop'] },
  { id: 'wisuda', label: 'Wisuda', emoji: '🎓', keys: ['wisuda'] },
  { id: 'event', label: 'Event kampus', emoji: '📅', keys: ['event', 'acara', 'festival'] },
]

function hay(food) {
  return `${food.title || ''} ${food.description || ''} ${food.organization || ''} ${food.location || ''}`.toLowerCase()
}

/** Estimasi kg per porsi dari judul/deskripsi. */
function kgPerPortion(food) {
  const t = hay(food)
  if (/nasi|box|kotak|lauk|makan siang|berat/.test(t)) return 0.45
  if (/roti|pastry|snack|kue|cemilan/.test(t)) return 0.12
  if (/buah|salad|segar/.test(t)) return 0.2
  if (/minuman|jus|teh|kopi/.test(t)) return 0.25
  return 0.3
}

export function detectFoodSource(food) {
  const text = hay(food)
  const hit = SOURCE_MAP.find((s) => s.keys.some((k) => text.includes(k)))
  if (hit) {
    return {
      ...hit,
      detail: food.organization || hit.label,
    }
  }
  if (food.organization) {
    return {
      id: 'org',
      label: food.organization.split(/[·•|]/)[0].trim().slice(0, 28),
      emoji: '🏫',
      detail: food.organization,
    }
  }
  return { id: 'kampus', label: 'Kampus', emoji: '🏫', detail: 'Food Rescue kampus' }
}

export function estimateFoodImpact(food) {
  const remaining = Number(food.remaining ?? food.quantity ?? 0)
  const qty = Math.max(remaining, Number(food.quantity || remaining || 1))
  const kg = +(qty * kgPerPortion(food)).toFixed(1)
  const co2eKg = +(kg * 2.5).toFixed(1)
  return {
    wasteKg: kg,
    co2eKg,
    short: `Menyelamatkan ±${kg} kg makanan`,
    co2Label: `±${co2eKg} kg CO₂e`,
    wasteLabel: `Potensi limbah dicegah ±${kg} kg`,
  }
}

/**
 * AI Freshness — semakin dekat batas ambil, skor turun.
 * Juga dipengaruhi jenis makanan.
 */
export function computeFreshness(food) {
  const until = food.pickupUntil ? new Date(food.pickupUntil).getTime() : 0
  const ms = until - Date.now()
  const hoursLeft = ms / (1000 * 60 * 60)
  const t = hay(food)

  let base = 88
  if (/nasi|lauk|daging|ayam|ikan|berat/.test(t)) base = 86
  if (/roti|pastry|kue|kering/.test(t)) base = 92
  if (/buah|salad|segar/.test(t)) base = 90

  if (hoursLeft <= 0) {
    return {
      percent: 0,
      label: 'Tidak direkomendasikan',
      level: 'expired',
    }
  }
  if (hoursLeft < 0.5) {
    return {
      percent: Math.max(55, Math.round(base - 35)),
      label: 'Segera ambil',
      level: 'critical',
    }
  }
  if (hoursLeft < 1) {
    return {
      percent: Math.max(62, Math.round(base - 25)),
      label: 'Layak dikonsumsi',
      level: 'urgent',
    }
  }
  if (hoursLeft < 2) {
    return {
      percent: Math.max(72, Math.round(base - 12)),
      label: 'Layak dikonsumsi',
      level: 'warn',
    }
  }
  if (hoursLeft < 4) {
    return {
      percent: Math.min(96, Math.round(base + 2)),
      label: 'Layak dikonsumsi',
      level: 'good',
    }
  }
  return {
    percent: Math.min(98, Math.round(base + 6)),
    label: 'Masih sangat segar',
    level: 'fresh',
  }
}

export function computePriority(food) {
  const until = food.pickupUntil ? new Date(food.pickupUntil).getTime() : 0
  const hoursLeft = (until - Date.now()) / (1000 * 60 * 60)
  const remaining = Number(food.remaining ?? food.quantity ?? 0)
  const qty = Number(food.quantity || remaining || 1)
  const fillRatio = remaining / Math.max(1, qty)

  if (hoursLeft > 0 && hoursLeft <= 1) {
    return { urgent: true, label: 'Disarankan segera diambil', reason: 'Sisa waktu kurang dari 1 jam' }
  }
  if (hoursLeft > 0 && hoursLeft <= 2 && fillRatio > 0.6) {
    return { urgent: true, label: 'Disarankan segera diambil', reason: 'Banyak porsi tersisa mendekati batas waktu' }
  }
  if (hoursLeft > 0 && hoursLeft <= 3) {
    return { urgent: true, label: 'Prioritas tinggi', reason: 'Akan berakhir dalam beberapa jam' }
  }
  return { urgent: false, label: null, reason: null }
}

function userFoodSignals(user, foods = [], uid) {
  const impact = user?.impact || {}
  const foodKg = Number(impact.foodRescuedKg || 0)
  const claimed = foods.filter((f) => Number(f.claimedBy?.[uid] || f.myClaims || 0) > 0)
  const heavyClaims = claimed.filter((f) => /nasi|box|kotak|lauk|berat/.test(hay(f))).length
  return {
    foodActive: foodKg > 0 || claimed.length > 0,
    foodKg,
    claimCount: claimed.length,
    prefersHeavy: heavyClaims >= 1,
  }
}

export function computeFoodRecommendation(food, user, foods = []) {
  const uid = String(user?.id || '')
  const signals = userFoodSignals(user, foods, uid)
  const freshness = computeFreshness(food)
  const priority = computePriority(food)
  const loc = String(food.location || '').toLowerCase()
  const reasons = []
  let score = 70

  if (priority.urgent) {
    score += 12
    reasons.push('mendekati batas pengambilan')
  }
  if (freshness.percent >= 85) {
    score += 8
    reasons.push('freshness tinggi')
  }
  if (signals.prefersHeavy && /nasi|box|kotak|lauk|berat/.test(hay(food))) {
    score += 10
    reasons.push('sesuai pola klaim makanan beratmu')
  }
  if (signals.foodActive) {
    score += 6
    reasons.push('kamu aktif di Food Rescue')
  }
  // lokasi “dekat” — heuristik demo dari string lokasi kampus umum
  if (/sv|fakultas|gedung|kantin|plaza|lt\.|lantai/.test(loc)) {
    score += 5
    reasons.push('lokasi pengambilan di area kampus yang mudah dijangkau')
  }

  const matchPercent = Math.min(98, score)
  const recommended = matchPercent >= 82 && freshness.percent > 0

  return {
    recommended,
    matchPercent,
    reasons: reasons.slice(0, 3),
    headline:
      reasons.length > 0
        ? `Direkomendasikan karena ${reasons.slice(0, 2).join(', ')}`
        : 'Direkomendasikan berdasarkan aktivitas Food Rescue-mu',
  }
}

export function rankFoodRecommendations(foods, user, limit = 3) {
  return [...foods]
    .map((food) => ({
      food,
      ...computeFoodRecommendation(food, user, foods),
      freshness: computeFreshness(food),
    }))
    .filter((row) => row.recommended && row.freshness.percent > 0)
    .sort((a, b) => b.matchPercent - a.matchPercent || b.freshness.percent - a.freshness.percent)
    .slice(0, limit)
}
