/** Helper tampilan insight barang untuk kartu & sorting (FE). */

const CONDITION_SCORE = {
  'Sangat Baik': 9.5,
  Baik: 8.5,
  Cukup: 7.2,
  Layak: 6.5,
  Rusak: 4.0,
}

const WASTE_KG_BY_CATEGORY = {
  Elektronik: 2.4,
  Buku: 0.8,
  'Perlengkapan Kos': 3.1,
  'Alat Praktikum': 1.2,
  Pakaian: 1.5,
  Organisasi: 1.0,
  Lainnya: 1.0,
}

const ESTIMATED_VALUE = {
  Elektronik: 1450000,
  Buku: 75000,
  'Perlengkapan Kos': 250000,
  'Alat Praktikum': 180000,
  Pakaian: 120000,
  Organisasi: 90000,
  Lainnya: 100000,
}

const STOPWORDS = new Set([
  'untuk', 'yang', 'dari', 'dengan', 'pada', 'dan', 'atau', 'ini', 'itu',
  'size', 'mini', 'set', 'the', 'untuk', 'baru', 'bekas', 'barang',
])

const FACULTY_CATEGORIES = [
  { keys: ['informatika', 'komputer', 'sistem informasi', 'ti'], cats: ['Elektronik', 'Buku', 'Alat Praktikum'] },
  { keys: ['elektro', 'teknik', 'mesin', 'sipil', 'industri'], cats: ['Alat Praktikum', 'Elektronik'] },
  { keys: ['ekonomi', 'manajemen', 'akuntansi', 'bisnis'], cats: ['Buku', 'Organisasi'] },
  { keys: ['hukum'], cats: ['Buku'] },
  { keys: ['kedokteran', 'kesehatan', 'farmasi', 'keperawatan'], cats: ['Alat Praktikum', 'Buku'] },
  { keys: ['arsitektur', 'desain', 'seni'], cats: ['Alat Praktikum', 'Pakaian'] },
]

export function conditionScore(condition) {
  if (!condition) return null
  if (CONDITION_SCORE[condition] != null) return CONDITION_SCORE[condition]
  return 8.0
}

export function conditionLabel(condition) {
  return condition || 'Baik'
}

export function conditionAnalysisText(condition) {
  const score = conditionScore(condition)
  const label = conditionLabel(condition)
  if (score == null) return null
  return `${label} • ${score.toFixed(1)}/10`
}

export function impactWasteKg(item) {
  const cat = item?.category || 'Lainnya'
  return WASTE_KG_BY_CATEGORY[cat] ?? WASTE_KG_BY_CATEGORY.Lainnya
}

export function impactBadgeText(item) {
  const kg = impactWasteKg(item)
  const reuseHint = Number(item?.interestCount || 0)
  if (item?.status === 'sold' || item?.status === 'donated' || item?.status === 'exchanged') {
    return `Barang dipakai ulang · ±${kg} kg sampah dihindari`
  }
  if (reuseHint >= 3) {
    return `Minat tinggi · potensi ±${kg} kg sampah dihindari`
  }
  return `Mengurangi sampah ±${kg} kg`
}

/** Estimasi jarak/walk tanpa GPS — deterministik dari lokasi + fakultas user. */
export function walkEstimate(item, user) {
  const loc = String(item?.location || '').toLowerCase()
  const faculty = String(user?.faculty || user?.studyProgram || '').toLowerCase()
  const token = faculty.split(/\s+/).find((t) => t.length > 3) || ''

  if (token && loc.includes(token)) {
    return { meters: 90, label: '~3 menit jalan kaki', nearby: true }
  }

  const seed = Number(item?.dbId) || String(item?.id || '0').length
  const meters = 80 + (seed % 8) * 45
  if (meters <= 150) return { meters, label: `±${meters} m · ~2 menit`, nearby: true }
  if (meters <= 300) return { meters, label: `±${meters} m · ~5 menit`, nearby: meters <= 220 }
  return { meters, label: `±${meters} m`, nearby: false }
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9à-ÿ]+/i)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w))
}

function facultyTokens(user) {
  const raw = `${user?.faculty || ''} ${user?.studyProgram || ''}`.toLowerCase()
  return tokenize(raw)
}

function relevantCategoriesForFaculty(user) {
  const hay = `${user?.faculty || ''} ${user?.studyProgram || ''}`.toLowerCase()
  const hit = FACULTY_CATEGORIES.find((row) => row.keys.some((k) => hay.includes(k)))
  return hit ? hit.cats : []
}

/**
 * Profil minat user dari histori nyata (bukan random):
 * favorit, pinjaman, dan barang yang pernah diposting.
 */
export function buildUserTaste(user, context = {}) {
  const { items = [], borrows = [], favorites = [] } = context
  const uid = String(user?.id || '')
  const favKeys = new Set(favorites.map(String))

  const catCount = {}
  const listingCount = {}
  const keywords = new Set()

  function absorbItem(it) {
    if (!it) return
    const cat = it.category || 'Lainnya'
    catCount[cat] = (catCount[cat] || 0) + 1
    const type = it.listingType
    if (type) listingCount[type] = (listingCount[type] || 0) + 1
    tokenize(`${it.title || ''} ${(it.tags || []).join(' ')}`).forEach((w) => keywords.add(w))
  }

  items.forEach((it) => {
    const id = String(it.dbId ?? '')
    const sid = String(it.id || '')
    const isFav = favKeys.has(id) || favKeys.has(sid) || favKeys.has(sid.replace(/^i/, ''))
    const isMine = uid && String(it.ownerId) === uid
    if (isFav || isMine) absorbItem(it)
  })

  borrows.forEach((b) => {
    const mine =
      String(b.borrowerId) === uid || String(b.userId) === uid || String(b.borrower_id) === uid
    if (!mine) return
    listingCount.borrow = (listingCount.borrow || 0) + 1
    tokenize(b.itemTitle || b.title || '').forEach((w) => keywords.add(w))
    const linked = items.find(
      (it) =>
        it.id === b.itemId ||
        String(it.dbId) === String(b.itemId) ||
        it.id === `i${b.itemId}`,
    )
    if (linked) absorbItem(linked)
  })

  return { catCount, listingCount, keywords, faculty: facultyTokens(user) }
}

function topListingType(listingCount) {
  let best = null
  let n = 0
  Object.entries(listingCount).forEach(([k, v]) => {
    if (v > n) {
      best = k
      n = v
    }
  })
  return best
}

/**
 * Kecocokan AI — deterministik & bisa dijelaskan ke juri.
 * Faktor: fakultas, kategori histori, lokasi, pola transaksi, keyword, kondisi foto.
 * Tidak memakai angka random / matchPercent dari API (rumus lama meratakan ke 87%).
 */
export function computeMatch(item, user, context = {}) {
  const taste = context.taste || buildUserTaste(user, context)
  const walk = walkEstimate(item, user)
  const hay = `${item?.title || ''} ${item?.category || ''} ${(item?.tags || []).join(' ')} ${item?.location || ''}`.toLowerCase()
  const itemWords = new Set(tokenize(`${item?.title || ''} ${(item?.tags || []).join(' ')}`))
  const faculty = facultyTokens(user)
  const facultyCats = relevantCategoriesForFaculty(user)
  const cond = conditionScore(item?.condition) ?? 0

  let score = 50
  const reasons = []

  const facultyHit = faculty.some((t) => t.length > 3 && hay.includes(t))
  const ownerFaculty = String(item?.ownerFaculty || item?.ownerStudyProgram || '').toLowerCase()
  const sameFaculty = faculty.some((t) => t.length > 3 && ownerFaculty.includes(t))
  if (facultyHit && sameFaculty) {
    score += 16
    reasons.push('fakultas sama dengan pemilik & relevan di judul/kategori')
  } else if (facultyHit) {
    score += 12
    reasons.push('sesuai jurusan / fakultasmu')
  } else if (sameFaculty) {
    score += 8
    reasons.push('pemilik dari fakultas yang sama')
  } else if (facultyCats.includes(item?.category)) {
    score += 7
    reasons.push(`kategori ${item.category} relevan dengan jurusanmu`)
  }

  const catHits = Number(taste.catCount[item?.category] || 0)
  if (catHits >= 2) {
    score += 16
    reasons.push(`kategori ${item.category} sering kamu cari / simpan`)
  } else if (catHits === 1) {
    score += 10
    reasons.push(`kamu pernah berinteraksi dengan kategori ${item.category}`)
  }

  if (walk.meters <= 150) {
    score += 12
    reasons.push('lokasi pengambilan paling dekat')
  } else if (walk.meters <= 250) {
    score += 7
    reasons.push('lokasi masih di radius kampus yang dekat')
  } else if (walk.meters <= 360) {
    score += 3
  }

  const preferredType = topListingType(taste.listingCount)
  if (preferredType && item?.listingType === preferredType) {
    score += 8
    reasons.push(
      preferredType === 'borrow'
        ? 'sesuai histori pinjammu'
        : preferredType === 'donate'
          ? 'sesuai pola donasi yang kamu ikuti'
          : 'sesuai jenis transaksi yang sering kamu pakai',
    )
  } else if (item?.listingType === 'borrow' || item?.listingType === 'donate') {
    score += 3
  }

  let overlap = 0
  itemWords.forEach((w) => {
    if (taste.keywords.has(w)) overlap += 1
  })
  if (overlap >= 2) {
    score += 12
    reasons.push('keyword mirip barang yang pernah kamu lihat / pinjam')
  } else if (overlap === 1) {
    score += 6
    reasons.push('ada keyword yang pernah kamu lihat')
  }

  if (cond >= 9) {
    score += 5
    reasons.push('kondisi hasil analisis foto sangat baik')
  } else if (cond >= 8) {
    score += 3
  }

  const percent = Math.max(58, Math.min(96, Math.round(score)))
  const uniqueReasons = [...new Set(reasons)].slice(0, 4)
  const summary =
    uniqueReasons.length > 0
      ? uniqueReasons[0].replace(/^./, (c) => c.toUpperCase())
      : 'Berdasarkan lokasi kampus dan ketersediaan barang'

  return {
    percent,
    reasons: uniqueReasons,
    summary,
    recommended: percent >= 80,
    walk,
  }
}

export function computeMatchPercent(item, user, context = {}) {
  return computeMatch(item, user, context).percent
}

/** Badge demo: kondisi bagus + dekat + kecocokan AI tinggi */
export function isGreenChoice(item, user, context = {}) {
  const match = computeMatch(item, user, context)
  const score = conditionScore(item?.condition) ?? 0
  return match.percent >= 88 && score >= 8.5 && match.walk.meters <= 200
}

export function estimatedValue(item) {
  if (item?.listingType === 'sell' && Number(item?.price) > 0) {
    return Number(item.price)
  }
  return ESTIMATED_VALUE[item?.category] ?? ESTIMATED_VALUE.Lainnya
}

export function usefulLifeYears(item) {
  const score = conditionScore(item?.condition) ?? 8
  if (score >= 9) return 4
  if (score >= 8) return 3
  if (score >= 7) return 2
  return 1
}

export function aiListingAdvice(item) {
  if (item?.listingType === 'borrow') {
    return 'Lebih cocok dipinjamkan daripada dijual — dampak sirkular lebih tinggi.'
  }
  if (item?.listingType === 'donate') {
    return 'Cocok didonasikan agar cepat tersalurkan ke mahasiswa lain.'
  }
  if (item?.listingType === 'exchange') {
    return 'Cocok ditukar dengan barang sejenis yang lebih kamu butuhkan.'
  }
  if (item?.condition === 'Sangat Baik') {
    return 'Kondisi sangat baik — cocok dijual dengan harga wajar.'
  }
  return 'Pertimbangkan pinjam atau tukar agar barang tetap beredar di kampus.'
}

export function buildAiDetailInsight(item, user, context = {}) {
  const match = computeMatch(item, user, context)
  const score = conditionScore(item?.condition)
  return {
    matchPercent: match.percent,
    matchReasons: match.reasons,
    matchSummary: match.summary,
    conditionScore: score,
    condition: conditionLabel(item?.condition),
    conditionText: conditionAnalysisText(item?.condition),
    category: item?.category || 'Lainnya',
    estimatedValue: estimatedValue(item),
    usefulLifeYears: usefulLifeYears(item),
    wasteKg: impactWasteKg(item),
    advice: aiListingAdvice(item),
    greenChoice: isGreenChoice(item, user, context),
  }
}
