const KEYWORD_MAP = [
  {
    keys: [
      'kalkulator',
      'casio',
      'mouse',
      'laptop',
      'charger',
      'headset',
      'flashdisk',
      'usb',
      'tripod',
      'proyektor',
      'projector',
      'epson',
      'viewsonic',
      'monitor',
      'keyboard',
      'speaker',
      'powerbank',
      'webcam',
      'hdmi',
      'kabel',
      'remote',
      'earphone',
      'tablet',
      'iphone',
      'android',
    ],
    category: 'Elektronik',
    condition: 'Baik',
    listingType: 'sell',
    lookingFor: null,
    tags: ['elektronik', 'gadget'],
  },
  {
    keys: [
      'buku',
      'modul',
      'novel',
      'algoritma',
      'kalkulus',
      'kamus',
      'textbook',
      'diktat',
      'novel',
      'komik',
    ],
    category: 'Buku',
    condition: 'Sangat Baik',
    listingType: 'borrow',
    lookingFor: null,
    tags: ['buku', 'belajar'],
  },
  {
    keys: ['hoodie', 'jaket', 'kaos', 'sepatu', 'tas', 'celana', 'kemeja', 'sweater', 'topi'],
    category: 'Pakaian',
    condition: 'Baik',
    listingType: 'donate',
    lookingFor: null,
    tags: ['pakaian', 'fashion'],
  },
  {
    keys: ['matras', 'bola', 'raket', 'sepak', 'yoga', 'dumbbell', 'cone', 'net', 'plank'],
    category: 'Organisasi',
    condition: 'Baik',
    listingType: 'borrow',
    lookingFor: null,
    tags: ['olahraga', 'ukm'],
  },
  {
    keys: [
      'pulpen',
      'penggaris',
      'jangka',
      'spidol',
      'binder',
      'stabilo',
      'praktikum',
      'mikroskop',
      'pipet',
      'lab',
    ],
    category: 'Alat Praktikum',
    condition: 'Baik',
    listingType: 'donate',
    lookingFor: null,
    tags: ['praktikum'],
  },
  {
    keys: ['meja', 'kursi', 'lampu', 'rak', 'kos', 'bantal', 'selimut', 'gantungan', 'jemuran'],
    category: 'Perlengkapan Kos',
    condition: 'Cukup',
    listingType: 'exchange',
    lookingFor: 'Perlengkapan Kos',
    tags: ['kos'],
  },
  {
    keys: ['dompet', 'jam', 'strap', 'case', 'casing', 'sarung', 'aksesori', 'accessor'],
    category: 'Aksesori',
    condition: 'Baik',
    listingType: 'sell',
    lookingFor: null,
    tags: ['aksesori'],
  },
]

const FOOD_MAP = [
  {
    keys: ['nasi goreng', 'nasgor', 'nasi box', 'nasi kotak', 'catering', 'nasi'],
    foodType: 'Nasi / makanan berat',
    foodCategory: 'Makanan berat',
    unit: 'porsi',
    kgPerUnit: 0.4,
    safeHours: 3,
    wasteRisk: 'Tinggi',
  },
  {
    keys: ['ayam', 'teriyaki', 'rendang', 'sate', 'lauk'],
    foodType: 'Lauk / protein',
    foodCategory: 'Makanan berat',
    unit: 'porsi',
    kgPerUnit: 0.35,
    safeHours: 3,
    wasteRisk: 'Tinggi',
  },
  {
    keys: ['roti', 'pastry', 'croissant', 'kue', 'donat', 'bolu'],
    foodType: 'Roti / kue',
    foodCategory: 'Camilan',
    unit: 'pcs',
    kgPerUnit: 0.15,
    safeHours: 5,
    wasteRisk: 'Sedang',
  },
  {
    keys: ['buah', 'apel', 'pisang', 'salad', 'jeruk'],
    foodType: 'Buah / salad',
    foodCategory: 'Segar',
    unit: 'porsi',
    kgPerUnit: 0.25,
    safeHours: 4,
    wasteRisk: 'Tinggi',
  },
  {
    keys: ['minuman', 'kopi', 'teh', 'juice', 'es'],
    foodType: 'Minuman',
    foodCategory: 'Minuman',
    unit: 'pcs',
    kgPerUnit: 0.3,
    safeHours: 6,
    wasteRisk: 'Rendah',
  },
  {
    keys: ['snack', 'gorengan', 'risoles', 'pastel'],
    foodType: 'Camilan goreng',
    foodCategory: 'Camilan',
    unit: 'pcs',
    kgPerUnit: 0.12,
    safeHours: 2,
    wasteRisk: 'Sedang',
  },
]

const CONDITION_SCORE = {
  'Sangat Baik': 9.5,
  Baik: 8.5,
  Cukup: 7.2,
  Layak: 6.5,
  Rusak: 4.0,
}

const PRICE_BY_CATEGORY = {
  Elektronik: [60000, 90000],
  Buku: [15000, 35000],
  Pakaian: [20000, 45000],
  Organisasi: [25000, 50000],
  'Alat Praktikum': [10000, 30000],
  'Perlengkapan Kos': [30000, 70000],
  Aksesori: [15000, 40000],
  Lainnya: [15000, 35000],
}

function matchMap(text, map) {
  const t = text.toLowerCase()
  return map.find((row) => row.keys.some((k) => t.includes(k)))
}

function listingLabel(type) {
  return (
    {
      sell: 'jual',
      borrow: 'pinjam',
      donate: 'donasi',
      exchange: 'tukar',
    }[type] || type
  )
}

function buildReasons(hit, matched) {
  const listing = listingLabel(hit.listingType)
  if (!matched) {
    return [
      'Objek padat terdeteksi dari foto',
      'Tidak terlihat kerusakan besar pada permukaan',
      `Cocok dipublikasikan sebagai listing ${listing}`,
    ]
  }
  return [
    `Bentuk dan kata kunci mengarah ke kategori ${hit.category}`,
    `Kondisi tampak ${String(hit.condition).toLowerCase()} dari foto`,
    `Cocok dipublikasikan sebagai listing ${listing}`,
  ]
}

function priceBand(category, listingType, suggested) {
  if (listingType !== 'sell') {
    return { suggestedPrice: 0, priceMin: 0, priceMax: 0 }
  }
  const [min, max] = PRICE_BY_CATEGORY[category] || PRICE_BY_CATEGORY.Lainnya
  const mid = suggested || Math.round((min + max) / 2)
  return {
    suggestedPrice: mid,
    priceMin: min,
    priceMax: max,
  }
}

/** Mock AI: analyze item title/description/filename */
export function analyzeItemAi({ title = '', description = '', fileName = '' }) {
  const blob = `${title} ${description} ${fileName}`
  const matched = matchMap(blob, KEYWORD_MAP)
  const hit = matched || {
    category: 'Elektronik',
    condition: 'Baik',
    listingType: 'sell',
    lookingFor: null,
    tags: ['kampus', 'elektronik'],
  }

  const confidence = matched ? 88 + Math.floor(Math.random() * 8) : 78 + Math.floor(Math.random() * 6)
  const conditionScore = CONDITION_SCORE[hit.condition] ?? 8.0
  const prices = priceBand(
    hit.category,
    hit.listingType,
    hit.listingType === 'sell'
      ? hit.category === 'Elektronik'
        ? 75000
        : 25000
      : 0,
  )

  const suggestedTitle =
    title.trim() ||
    (fileName
      ? fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
      : `Barang ${hit.category} kampus`)

  const priceText = prices.suggestedPrice
    ? `Rp ${Number(prices.suggestedPrice).toLocaleString('id-ID')}`
    : 'tanpa harga (bukan jual)'

  return {
    title: suggestedTitle.replace(/\b\w/g, (c) => c.toUpperCase()),
    category: hit.category,
    condition: hit.condition,
    conditionScore,
    listingType: hit.listingType,
    lookingFor: hit.lookingFor || (hit.listingType === 'exchange' ? hit.category : ''),
    tags: hit.tags,
    confidence,
    reasons: buildReasons(hit, Boolean(matched)),
    summary: `AI mendeteksi barang dalam kondisi ${String(hit.condition).toLowerCase()} dan memperkirakan nilai sekitar ${priceText}. Kamu masih bisa mengubah kategori, harga, dan deskripsi pada langkah berikutnya sebelum dipublikasikan.`,
    tip: `AI mendeteksi barang dalam kondisi ${String(hit.condition).toLowerCase()} dan memperkirakan nilai sekitar ${priceText}. Kamu masih bisa mengubah kategori, harga, dan deskripsi pada langkah berikutnya sebelum dipublikasikan.`,
    ...prices,
  }
}

export function analyzeFoodAi({ title = '', quantity = 10, fileName = '' }) {
  const blob = `${title} ${fileName}`
  const matched = matchMap(blob, FOOD_MAP)
  const hit = matched || {
    foodType: 'Makanan kampus',
    foodCategory: 'Umum',
    unit: 'porsi',
    kgPerUnit: 0.3,
    safeHours: 3,
    wasteRisk: 'Sedang',
  }

  const qty = Math.max(1, Number(quantity) || 10)
  const safeHours = qty > 20 ? Math.max(2, hit.safeHours - 1) : hit.safeHours
  let safetyLevel = 'safe'
  let safetyLabel = 'Aman dikonsumsi'
  let safetyHint = `Estimasi hingga ±${safeHours} jam lagi.`
  if (safeHours < 1) {
    safetyLevel = 'unsafe'
    safetyLabel = 'Tidak direkomendasikan dipublikasikan'
    safetyHint = 'Estimasi waktu aman terlalu singkat.'
  } else if (safeHours <= 2) {
    safetyLevel = 'urgent'
    safetyLabel = 'Segera diklaim'
    safetyHint = `Sisa waktu sekitar ${safeHours} jam.`
  }

  const estimatedKg = +(qty * hit.kgPerUnit).toFixed(1)
  const co2eKg = +(estimatedKg * 2.5).toFixed(1)
  const maxClaimPerUser = qty > 20 ? 2 : qty > 10 ? 2 : 3
  const estimatedClaims = Math.max(3, Math.round(qty * 0.7))
  const wasteRisk = qty > 15 ? 'Tinggi' : hit.wasteRisk

  const suggestedTitle =
    title.trim() ||
    (fileName
      ? fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
      : hit.foodType)

  const d = new Date()
  d.setHours(d.getHours() + safeHours)
  const pickupHourLabel = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  const description = [
    `Sisa ${String(hit.foodType).toLowerCase()} yang masih layak dikonsumsi.`,
    `Silakan ambil maksimal ${maxClaimPerUser} ${hit.unit}/orang.`,
    `Ambil sebelum pukul ${pickupHourLabel} WIB.`,
  ].join(' ')

  const tip = `AI mendeteksi ${String(hit.foodType).toLowerCase()} (~${qty} ${hit.unit}) dengan status "${safetyLabel}". Batas klaim disarankan pukul ${pickupHourLabel}. Kamu masih bisa mengubah detail sebelum dipublikasikan.`

  return {
    title: suggestedTitle.replace(/\b\w/g, (c) => c.toUpperCase()),
    description,
    foodType: hit.foodType,
    foodCategory: hit.foodCategory,
    unit: hit.unit,
    estimatedPortions: qty,
    safeHours,
    safeUntilLabel: `±${safeHours} jam lagi`,
    recommendPickupLabel: pickupHourLabel,
    recommendWindow: `${safeHours} jam sebelum kedaluwarsa`,
    safetyLevel,
    safetyLabel,
    safetyHint,
    wasteRisk,
    estimatedClaims,
    estimatedKg,
    co2eKg,
    maxClaimPerUser,
    confidence: matched ? 90 : 80,
    reasons: [
      `Jenis makanan dikenali sebagai ${hit.foodType}`,
      `Estimasi porsi sekitar ${qty} ${hit.unit}`,
      `Waktu aman dikonsumsi sekitar ${safeHours} jam`,
      `Saran maksimal klaim ${maxClaimPerUser} ${hit.unit}/orang`,
    ],
    checks: [
      'Jenis makanan dikenali',
      'Estimasi porsi',
      'Estimasi waktu aman',
      'Saran batas klaim',
      'Deskripsi dibuat otomatis',
    ],
    tip,
    summary: tip,
  }
}
