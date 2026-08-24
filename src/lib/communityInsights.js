/** Insight & rekomendasi AI untuk halaman Komunitas (FE demo). */

const CATEGORIES = [
  {
    id: 'lingkungan',
    label: 'Lingkungan',
    emoji: '🌱',
    keys: ['bersih', 'kampus', 'sampah', 'pohon', 'tanam', 'lingkungan'],
  },
  {
    id: 'sustainability',
    label: 'Sustainability',
    emoji: '♻',
    keys: ['repair', 'sustainability', 'green', 'daur', 'reuse', 'sirkular'],
  },
  {
    id: 'edukasi',
    label: 'Edukasi',
    emoji: '📚',
    keys: ['buku', 'workshop', 'seminar', 'edukasi', 'belajar', 'donasi buku'],
  },
  {
    id: 'sosial',
    label: 'Sosial',
    emoji: '🤝',
    keys: ['donasi', 'sosial', 'relawan', 'bantu', 'komunitas'],
  },
  {
    id: 'teknologi',
    label: 'Teknologi',
    emoji: '💻',
    keys: ['informatika', 'teknologi', 'elektronik', 'ai', 'maker', 'lab'],
  },
  {
    id: 'food',
    label: 'Food Rescue',
    emoji: '🍱',
    keys: ['food', 'makanan', 'rescue', 'kantin', 'sisa'],
  },
]

function haystack(item) {
  return `${item.title || ''} ${item.description || ''} ${item.organizer || ''}`.toLowerCase()
}

export function detectCategory(item) {
  const text = haystack(item)
  const hit =
    CATEGORIES.find((cat) => cat.keys.some((k) => text.includes(k))) ||
    CATEGORIES.find((c) => c.id === 'sosial')
  return hit
}

export function estimateImpact(item) {
  const cat = detectCategory(item)
  const q = Number(item.quota || item.registered || 20)
  if (cat.id === 'lingkungan') {
    const kg = Math.round(q * 1.5)
    return {
      label: `≈ ${kg} kg sampah dibersihkan`,
      short: `Mengurangi ~${kg} kg sampah`,
      kgWaste: kg,
      areaHa: Math.max(0.5, Math.round(q / 20)),
    }
  }
  if (cat.id === 'food') {
    const portions = Math.round(q * 30)
    return {
      label: `≈ ${portions} porsi makanan dibagikan`,
      short: `Menyelamatkan ~${portions} porsi`,
      kgWaste: Math.round(portions * 0.3),
      areaHa: null,
    }
  }
  if (cat.id === 'sustainability') {
    const kg = Math.round(q * 1.2)
    return {
      label: `≈ ${kg} kg barang dipakai ulang`,
      short: `Mengurangi ~${kg} kg sampah`,
      kgWaste: kg,
      areaHa: null,
    }
  }
  if (cat.id === 'edukasi') {
    return {
      label: `≈ ${Math.round(q * 2)} buku / peserta terbantu`,
      short: `Dampak edukasi ~${q} peserta`,
      kgWaste: Math.round(q * 0.4),
      areaHa: null,
    }
  }
  return {
    label: `≈ ${Math.round(q * 1.5)} kg dampak positif`,
    short: `Estimasi dampak positif kampus`,
    kgWaste: Math.round(q * 1.5),
    areaHa: null,
  }
}

/** Badge tambahan di atas judul (selain kategori utama). */
export function eventBadges(item) {
  const cat = detectCategory(item)
  const text = haystack(item)
  const badges = [{ emoji: cat.emoji, label: cat.label }]
  if (cat.id === 'lingkungan' || text.includes('sampah') || text.includes('bersih')) {
    badges.push({ emoji: '♻', label: 'Zero Waste' })
  }
  if (text.includes('relawan') || text.includes('volunteer') || text.includes('gotong')) {
    badges.push({ emoji: '🤝', label: 'Volunteer' })
  }
  if (cat.id === 'sustainability' || text.includes('repair')) {
    badges.push({ emoji: '♻', label: 'Circular' })
  }
  if (cat.id === 'food') {
    badges.push({ emoji: '🍱', label: 'Food Rescue' })
  }
  if (cat.id === 'edukasi') {
    badges.push({ emoji: '📚', label: 'Edukasi' })
  }
  // dedupe by label
  const seen = new Set()
  return badges.filter((b) => {
    if (seen.has(b.label)) return false
    seen.add(b.label)
    return true
  }).slice(0, 3)
}

export function bringChecklist(item) {
  const cat = detectCategory(item)
  const text = haystack(item)
  if (cat.id === 'lingkungan' || text.includes('bersih')) {
    return ['Botol minum', 'Sarung tangan', 'Topi / topi lipat', 'Alas kaki nyaman']
  }
  if (cat.id === 'food') {
    return ['Botol minum', 'Masker', 'Hand sanitizer', 'Tas reusable']
  }
  if (cat.id === 'sustainability' || text.includes('repair')) {
    return ['Alat tulis', 'Barang yang ingin diperbaiki (opsional)', 'Botol minum']
  }
  if (cat.id === 'edukasi' || text.includes('buku')) {
    return ['Buku yang ingin didonasikan', 'Tas reusable', 'Botol minum']
  }
  return ['Botol minum', 'Kartu identitas kampus', 'Pakaian nyaman']
}

export function personalImpactReward(item) {
  const cat = detectCategory(item)
  const q = Number(item.quota || 20)
  let score = 6
  let wasteKg = 1.5
  if (cat.id === 'lingkungan') {
    score = 8
    wasteKg = 2
  } else if (cat.id === 'food') {
    score = 7
    wasteKg = 1.8
  } else if (cat.id === 'sustainability') {
    score = 9
    wasteKg = 1.5
  } else if (cat.id === 'edukasi') {
    score = 5
    wasteKg = 0.8
  }
  // slight variance by quota size for demo
  if (q >= 40) score += 1
  return {
    scorePoints: score,
    greenBadge: 1,
    wasteKg,
  }
}

export function eventStats(item) {
  const impact = estimateImpact(item)
  const quota = Number(item.quota || 0)
  const registered = Number(item.registered ?? item.signedUp ?? 0)
  let durationHours = 3
  if (item.startsAt && item.endsAt) {
    const ms = new Date(item.endsAt).getTime() - new Date(item.startsAt).getTime()
    if (ms > 0) durationHours = Math.max(1, Math.round(ms / (1000 * 60 * 60)))
  }
  return {
    participants: quota || registered,
    registered,
    targetWasteKg: impact.kgWaste,
    areaHa: impact.areaHa,
    durationHours,
  }
}

export function aiInsight(item) {
  const cat = detectCategory(item)
  const impact = estimateImpact(item)
  const stats = eventStats(item)
  if (cat.id === 'lingkungan') {
    return `Berdasarkan prediksi cuaca dan ${stats.participants} kuota peserta, disarankan datang 15 menit lebih awal. AI memperkirakan kegiatan ini mengurangi ±${impact.kgWaste} kg sampah.`
  }
  if (cat.id === 'food') {
    return `AI memperkirakan distribusi berjalan lancar jika relawan datang tepat waktu. Potensi menyelamatkan ±${impact.kgWaste} kg makanan dari pembuangan.`
  }
  if (cat.id === 'sustainability') {
    return `AI memperkirakan workshop ini mengurangi ±${impact.kgWaste} kg sampah elektronik/perlengkapan kos. Datang 10 menit lebih awal untuk briefing.`
  }
  return `AI memperkirakan event ini berkontribusi ±${impact.kgWaste} kg dampak positif untuk kampus. Disarankan datang 10–15 menit lebih awal.`
}

export function qrCheckinStatus(item) {
  if (!item.startsAt) {
    return { active: false, label: 'QR Check-in belum dijadwalkan', minutesUntil: null }
  }
  const start = new Date(item.startsAt).getTime()
  const now = Date.now()
  const minsUntil = Math.round((start - now) / (1000 * 60))
  if (minsUntil <= 0) {
    return { active: true, label: 'QR Check-in aktif sekarang', minutesUntil: 0 }
  }
  if (minsUntil <= 30) {
    return { active: true, label: 'QR Check-in aktif', minutesUntil: minsUntil }
  }
  return {
    active: false,
    label: 'QR Check-in akan aktif 30 menit sebelum acara dimulai',
    minutesUntil: minsUntil,
  }
}

/** Aktivitas user yang dipakai AI untuk alasan rekomendasi. */
export function userActivityBullets(user, borrows = [], foods = []) {
  const impact = user?.impact || {}
  const bullets = []
  const foodKg = Number(impact.foodRescuedKg || 0)
  if (foodKg > 0) {
    bullets.push(`Menyelamatkan ${foodKg % 1 === 0 ? foodKg : foodKg.toFixed(1)} kg makanan`)
  } else if (foods.some((f) => Number(f.myClaims || 0) > 0)) {
    bullets.push('Aktif di Food Rescue')
  }
  const itemsSaved = Number(impact.itemsSaved || 0)
  if (itemsSaved > 0) {
    bullets.push(`Berdonasi / memakai ulang ${itemsSaved} barang`)
  } else if (borrows.some((b) => ['approved', 'returned'].includes(b.status))) {
    bullets.push('Pernah meminjam alat kampus')
  }
  const waste = Number(impact.wasteReducedKg || 0)
  if (waste > 0 && bullets.length < 3) {
    bullets.push(`Mengurangi ${waste % 1 === 0 ? waste : waste.toFixed(1)} kg sampah`)
  }
  if (borrows.some((b) => /repair|elektronik|laptop|proyektor/i.test(`${b.itemTitle || ''} ${b.title || ''}`))) {
    bullets.push('Mengikuti kegiatan / pinjam terkait repair')
  }
  if (bullets.length === 0) {
    bullets.push('Peduli keberlanjutan kampus')
    bullets.push('Tertarik kegiatan komunitas')
  }
  return bullets.slice(0, 4)
}

export function quotaProgress(item) {
  const registered = Number(item.registered ?? item.signedUp ?? 0)
  const quota = Math.max(1, Number(item.quota || 1))
  const pct = Math.min(100, Math.round((registered / quota) * 100))
  return { registered, quota, pct }
}

export function isOpen(item) {
  if (item.status && item.status !== 'open') return false
  const ms = item.startsAt ? new Date(item.startsAt).getTime() - Date.now() : 0
  return ms > 0 && Number(item.spotsLeft ?? 1) > 0
}

export function isPast(item) {
  const ms = item.startsAt ? new Date(item.startsAt).getTime() - Date.now() : 0
  return ms <= 0 || item.status === 'closed' || item.status === 'done'
}

export function filterByTime(items, filter) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(startOfToday)
  endOfToday.setDate(endOfToday.getDate() + 1)
  const endOfWeek = new Date(startOfToday)
  endOfWeek.setDate(endOfWeek.getDate() + 7)

  return items.filter((item) => {
    const at = item.startsAt ? new Date(item.startsAt) : null
    if (filter === 'today') {
      return at && at >= startOfToday && at < endOfToday
    }
    if (filter === 'week') {
      return at && at >= startOfToday && at < endOfWeek
    }
    if (filter === 'open') return isOpen(item)
    if (filter === 'done') return isPast(item)
    return true
  })
}

function userSignals(user, borrows = [], foods = []) {
  const impact = user?.impact || {}
  const foodActive = Number(impact.foodRescuedKg || 0) > 0 || foods.some((f) => Number(f.myClaims || 0) > 0)
  const reuseActive =
    Number(impact.itemsSaved || 0) > 0 ||
    borrows.some((b) => ['approved', 'returned'].includes(b.status))
  const faculty = String(user?.faculty || user?.studyProgram || '').toLowerCase()
  const techStudent = /informatika|teknik|komputer|ti\b|teknologi/.test(faculty)
  return { foodActive, reuseActive, techStudent, faculty }
}

function matchReason(item, signals) {
  const cat = detectCategory(item)
  const text = haystack(item)
  if (signals.foodActive && (cat.id === 'food' || text.includes('makanan'))) {
    return 'Kamu aktif di Food Rescue dan kegiatan berbagi makanan.'
  }
  if (signals.reuseActive && (cat.id === 'sustainability' || text.includes('repair'))) {
    return 'Kamu pernah meminjam barang dan mengikuti kegiatan sustainability.'
  }
  if (signals.techStudent && (cat.id === 'teknologi' || text.includes('elektronik'))) {
    return 'Sesuai jurusan dan minat teknologi kampus.'
  }
  if (cat.id === 'lingkungan') {
    return 'Cocok untuk mahasiswa yang peduli lingkungan kampus.'
  }
  return 'Direkomendasikan berdasarkan aktivitas keberlanjutan di kampus.'
}

export function computeAiMatch(item, user, borrows = [], foods = []) {
  const signals = userSignals(user, borrows, foods)
  const cat = detectCategory(item)
  const text = haystack(item)
  let score = 72

  if (signals.foodActive && (cat.id === 'food' || text.includes('food') || text.includes('makanan'))) {
    score += 18
  }
  if (signals.reuseActive && (cat.id === 'sustainability' || text.includes('repair'))) {
    score += 16
  }
  if (signals.techStudent && cat.id === 'teknologi') score += 14
  if (cat.id === 'lingkungan') score += 8
  if (Number(item.registered || item.signedUp || 0) > Number(item.quota || 0) * 0.6) score += 4

  const matchPercent = Math.min(98, score)
  const popular = Number(item.registered || item.signedUp || 0) >= Math.max(5, Number(item.quota || 0) * 0.5)
  const aiPick = matchPercent >= 90
  const bullets = userActivityBullets(user, borrows, foods)

  return {
    matchPercent,
    reason: matchReason(item, signals),
    bullets,
    aiPick,
    popular,
  }
}

export function rankRecommendations(items, user, borrows, foods, limit = 3) {
  return [...items]
    .map((item) => ({ item, ...computeAiMatch(item, user, borrows, foods) }))
    .filter(
      (row) =>
        row.matchPercent >= 85 &&
        isOpen(row.item) &&
        row.item.myStatus !== 'registered' &&
        row.item.myStatus !== 'approved',
    )
    .sort((a, b) => b.matchPercent - a.matchPercent)
    .slice(0, limit)
}

export function formatCountdown(iso) {
  if (!iso) return { label: '—', hoursLeft: null, dayLabel: null }
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return { label: 'Sudah lewat', hoursLeft: 0, dayLabel: 'Selesai' }

  const hours = Math.floor(ms / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)

  if (hours < 24) {
    return { label: `${hours} jam lagi`, hoursLeft: hours, dayLabel: 'Hari ini' }
  }
  if (days === 1) {
    return { label: `${hours % 24 || 24} jam lagi`, hoursLeft: hours, dayLabel: 'Besok' }
  }
  return { label: `${days} hari lagi`, hoursLeft: hours, dayLabel: ` ${days} hari lagi`.trim() }
}

export function calendarUrl(item) {
  if (!item.startsAt) return '#'
  const start = new Date(item.startsAt)
  const end = item.endsAt ? new Date(item.endsAt) : new Date(start.getTime() + 2 * 60 * 60 * 1000)
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: item.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: item.description || '',
    location: item.location || '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export { CATEGORIES }
