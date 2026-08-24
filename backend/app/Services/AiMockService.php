<?php

namespace App\Services;

use App\Models\PlatformSetting;

class AiMockService
{
    public const DEFAULT_KEYWORD_MAP = [
        [
            'keys' => [
                'kalkulator', 'casio', 'mouse', 'laptop', 'charger', 'headset', 'flashdisk', 'usb', 'tripod',
                'proyektor', 'projector', 'epson', 'viewsonic', 'monitor', 'keyboard', 'speaker', 'powerbank',
                'webcam', 'hdmi', 'kabel', 'remote', 'earphone', 'tablet',
            ],
            'category' => 'Elektronik',
            'condition' => 'Baik',
            'listingType' => 'sell',
            'lookingFor' => null,
            'tags' => ['elektronik'],
        ],
        [
            'keys' => ['buku', 'modul', 'novel', 'algoritma', 'kalkulus', 'kamus', 'textbook', 'diktat'],
            'category' => 'Buku',
            'condition' => 'Sangat Baik',
            'listingType' => 'borrow',
            'lookingFor' => null,
            'tags' => ['buku'],
        ],
        [
            'keys' => ['hoodie', 'jaket', 'kaos', 'sepatu', 'tas', 'celana', 'kemeja', 'sweater'],
            'category' => 'Pakaian',
            'condition' => 'Baik',
            'listingType' => 'donate',
            'lookingFor' => null,
            'tags' => ['pakaian'],
        ],
        [
            'keys' => ['matras', 'bola', 'raket', 'yoga', 'dumbbell', 'cone'],
            'category' => 'Organisasi',
            'condition' => 'Baik',
            'listingType' => 'borrow',
            'lookingFor' => null,
            'tags' => ['olahraga'],
        ],
        [
            'keys' => ['pulpen', 'penggaris', 'jangka', 'spidol', 'binder', 'praktikum', 'mikroskop', 'pipet', 'lab'],
            'category' => 'Alat Praktikum',
            'condition' => 'Baik',
            'listingType' => 'donate',
            'lookingFor' => null,
            'tags' => ['praktikum'],
        ],
        [
            'keys' => ['meja', 'kursi', 'lampu', 'rak', 'kos', 'bantal', 'selimut', 'jemuran'],
            'category' => 'Perlengkapan Kos',
            'condition' => 'Cukup',
            'listingType' => 'exchange',
            'lookingFor' => 'Perlengkapan Kos',
            'tags' => ['kos'],
        ],
        [
            'keys' => ['dompet', 'jam', 'strap', 'case', 'casing', 'aksesori'],
            'category' => 'Aksesori',
            'condition' => 'Baik',
            'listingType' => 'sell',
            'lookingFor' => null,
            'tags' => ['aksesori'],
        ],
    ];

    public static function platformDefaults(): array
    {
        return [
            'item_prompt' => 'Analisis barang kampus dari judul, deskripsi, dan nama file.',
            'food_prompt' => 'Prediksi risiko food waste, waktu publikasi, dan estimasi makanan terselamatkan.',
            'description_template' => 'Terdeteksi kemungkinan {category} kondisi {condition}. Cocok untuk listing {listingType}.',
            'price_elektronik' => 75000,
            'price_default' => 25000,
            'keyword_map' => self::DEFAULT_KEYWORD_MAP,
        ];
    }

    protected function settings(): array
    {
        return PlatformSetting::getJson('ai', []);
    }

    protected function keywordMap(): array
    {
        $map = $this->settings()['keyword_map'] ?? null;

        return is_array($map) && count($map) > 0 ? $map : self::DEFAULT_KEYWORD_MAP;
    }

    protected function listingTypeLabel(string $type): string
    {
        return match ($type) {
            'sell' => 'jual',
            'borrow' => 'pinjam',
            'donate' => 'donasi',
            'exchange' => 'tukar',
            default => $type,
        };
    }

    protected function conditionScore(string $condition): float
    {
        return match ($condition) {
            'Sangat Baik' => 9.5,
            'Baik' => 8.5,
            'Cukup' => 7.2,
            'Layak' => 6.5,
            'Rusak' => 4.0,
            default => 8.0,
        };
    }

    protected function priceBand(string $category, string $listingType, int $mid): array
    {
        if ($listingType !== 'sell') {
            return ['suggestedPrice' => 0, 'priceMin' => 0, 'priceMax' => 0];
        }

        $bands = [
            'Elektronik' => [60000, 90000],
            'Buku' => [15000, 35000],
            'Pakaian' => [20000, 45000],
            'Organisasi' => [25000, 50000],
            'Alat Praktikum' => [10000, 30000],
            'Perlengkapan Kos' => [30000, 70000],
            'Aksesori' => [15000, 40000],
            'Lainnya' => [15000, 35000],
        ];

        [$min, $max] = $bands[$category] ?? $bands['Lainnya'];

        return [
            'suggestedPrice' => $mid > 0 ? $mid : (int) round(($min + $max) / 2),
            'priceMin' => $min,
            'priceMax' => $max,
        ];
    }

    public function analyzeItem(string $title = '', string $description = '', string $fileName = ''): array
    {
        $blob = mb_strtolower("$title $description $fileName");
        $matched = collect($this->keywordMap())->first(
            fn ($row) => collect($row['keys'] ?? [])->contains(fn ($k) => str_contains($blob, mb_strtolower($k)))
        );

        $hit = $matched ?? [
            'category' => 'Elektronik',
            'condition' => 'Baik',
            'listingType' => 'sell',
            'lookingFor' => null,
            'tags' => ['kampus', 'elektronik'],
        ];

        $matchedBool = (bool) $matched;
        $confidence = $matchedBool ? random_int(88, 95) : random_int(78, 84);
        $condition = $hit['condition'] ?? 'Baik';
        $category = $hit['category'] ?? 'Elektronik';
        $listingType = $hit['listingType'] ?? 'sell';

        $suggestedTitle = trim($title) !== ''
            ? $title
            : (trim($fileName) !== ''
                ? ucwords(str_replace(['-', '_', '.'], ' ', pathinfo($fileName, PATHINFO_FILENAME)))
                : 'Barang '.$category);

        $settings = $this->settings();
        $priceElektronik = (int) ($settings['price_elektronik'] ?? 75000);
        $priceDefault = (int) ($settings['price_default'] ?? 25000);
        $mid = $listingType === 'sell'
            ? ($category === 'Elektronik' ? $priceElektronik : $priceDefault)
            : 0;
        $prices = $this->priceBand($category, $listingType, $mid);

        $listingLabel = $this->listingTypeLabel($listingType);
        $reasons = $matchedBool
            ? [
                "Bentuk dan kata kunci mengarah ke kategori {$category}",
                'Kondisi tampak '.mb_strtolower($condition).' dari foto',
                "Cocok dipublikasikan sebagai listing {$listingLabel}",
            ]
            : [
                'Objek padat terdeteksi dari foto',
                'Tidak terlihat kerusakan besar pada permukaan',
                "Cocok dipublikasikan sebagai listing {$listingLabel}",
            ];

        $priceText = $prices['suggestedPrice'] > 0
            ? 'Rp '.number_format($prices['suggestedPrice'], 0, ',', '.')
            : 'tanpa harga (bukan jual)';

        $tip = "AI mendeteksi barang dalam kondisi ".mb_strtolower($condition)." dan memperkirakan nilai sekitar {$priceText}. Kamu masih bisa mengubah kategori, harga, dan deskripsi pada langkah berikutnya sebelum dipublikasikan.";

        return [
            'title' => $suggestedTitle,
            'category' => $category,
            'condition' => $condition,
            'conditionScore' => $this->conditionScore($condition),
            'listingType' => $listingType,
            'lookingFor' => $hit['lookingFor'] ?? ($listingType === 'exchange' ? $category : null),
            'tags' => $hit['tags'] ?? ['kampus'],
            'confidence' => $confidence,
            'reasons' => $reasons,
            'summary' => $tip,
            'tip' => $tip,
            'suggestedPrice' => $prices['suggestedPrice'],
            'priceMin' => $prices['priceMin'],
            'priceMax' => $prices['priceMax'],
        ];
    }

    public function analyzeFood(string $title = '', int $quantity = 10, string $fileName = ''): array
    {
        $blob = mb_strtolower(trim("$title $fileName"));
        $map = [
            [
                'keys' => ['nasi goreng', 'nasgor', 'nasi box', 'nasi kotak', 'catering', 'nasi'],
                'foodType' => 'Nasi / makanan berat',
                'foodCategory' => 'Makanan berat',
                'unit' => 'porsi',
                'kgPerUnit' => 0.4,
                'safeHours' => 3,
                'wasteRisk' => 'Tinggi',
            ],
            [
                'keys' => ['ayam', 'teriyaki', 'rendang', 'sate', 'lauk'],
                'foodType' => 'Lauk / protein',
                'foodCategory' => 'Makanan berat',
                'unit' => 'porsi',
                'kgPerUnit' => 0.35,
                'safeHours' => 3,
                'wasteRisk' => 'Tinggi',
            ],
            [
                'keys' => ['roti', 'pastry', 'croissant', 'kue', 'donat', 'bolu'],
                'foodType' => 'Roti / kue',
                'foodCategory' => 'Camilan',
                'unit' => 'pcs',
                'kgPerUnit' => 0.15,
                'safeHours' => 5,
                'wasteRisk' => 'Sedang',
            ],
            [
                'keys' => ['buah', 'apel', 'pisang', 'salad', 'jeruk'],
                'foodType' => 'Buah / salad',
                'foodCategory' => 'Segar',
                'unit' => 'porsi',
                'kgPerUnit' => 0.25,
                'safeHours' => 4,
                'wasteRisk' => 'Tinggi',
            ],
            [
                'keys' => ['minuman', 'kopi', 'teh', 'juice', 'es'],
                'foodType' => 'Minuman',
                'foodCategory' => 'Minuman',
                'unit' => 'pcs',
                'kgPerUnit' => 0.3,
                'safeHours' => 6,
                'wasteRisk' => 'Rendah',
            ],
            [
                'keys' => ['snack', 'gorengan', 'risoles', 'pastel'],
                'foodType' => 'Camilan goreng',
                'foodCategory' => 'Camilan',
                'unit' => 'pcs',
                'kgPerUnit' => 0.12,
                'safeHours' => 2,
                'wasteRisk' => 'Sedang',
            ],
        ];

        $matched = collect($map)->first(
            fn ($row) => collect($row['keys'])->contains(fn ($k) => str_contains($blob, $k))
        );

        $hit = $matched ?? [
            'foodType' => 'Makanan kampus',
            'foodCategory' => 'Umum',
            'unit' => 'porsi',
            'kgPerUnit' => 0.3,
            'safeHours' => 3,
            'wasteRisk' => 'Sedang',
        ];

        $qty = max(1, $quantity);
        $safeHours = $qty > 20 ? max(2, (int) $hit['safeHours'] - 1) : (int) $hit['safeHours'];
        if ($safeHours < 1) {
            $safetyLevel = 'unsafe';
            $safetyLabel = 'Tidak direkomendasikan dipublikasikan';
            $safetyHint = 'Estimasi waktu aman terlalu singkat.';
        } elseif ($safeHours <= 2) {
            $safetyLevel = 'urgent';
            $safetyLabel = 'Segera diklaim';
            $safetyHint = "Sisa waktu sekitar {$safeHours} jam.";
        } else {
            $safetyLevel = 'safe';
            $safetyLabel = 'Aman dikonsumsi';
            $safetyHint = "Estimasi hingga ±{$safeHours} jam lagi.";
        }

        $estimatedKg = round($qty * (float) $hit['kgPerUnit'], 1);
        $co2eKg = round($estimatedKg * 2.5, 1);
        $maxClaimPerUser = $qty > 20 ? 2 : ($qty > 10 ? 2 : 3);
        $estimatedClaims = max(3, (int) round($qty * 0.7));
        $wasteRisk = $qty > 15 ? 'Tinggi' : $hit['wasteRisk'];

        $suggestedTitle = trim($title) !== ''
            ? $title
            : (trim($fileName) !== ''
                ? ucwords(str_replace(['-', '_', '.'], ' ', pathinfo($fileName, PATHINFO_FILENAME)))
                : $hit['foodType']);

        $pickup = now()->addHours($safeHours);
        $pickupHourLabel = $pickup->format('H.i');

        $description = "Sisa ".mb_strtolower($hit['foodType'])." yang masih layak dikonsumsi. Silakan ambil maksimal {$maxClaimPerUser} {$hit['unit']}/orang. Ambil sebelum pukul {$pickupHourLabel} WIB.";
        $tip = "AI mendeteksi ".mb_strtolower($hit['foodType'])." (~{$qty} {$hit['unit']}) dengan status \"{$safetyLabel}\". Batas klaim disarankan pukul {$pickupHourLabel}. Kamu masih bisa mengubah detail sebelum dipublikasikan.";

        return [
            'title' => $suggestedTitle,
            'description' => $description,
            'foodType' => $hit['foodType'],
            'foodCategory' => $hit['foodCategory'],
            'unit' => $hit['unit'],
            'estimatedPortions' => $qty,
            'safeHours' => $safeHours,
            'safeUntilLabel' => "±{$safeHours} jam lagi",
            'recommendPickupLabel' => $pickupHourLabel,
            'recommendWindow' => "{$safeHours} jam sebelum kedaluwarsa",
            'safetyLevel' => $safetyLevel,
            'safetyLabel' => $safetyLabel,
            'safetyHint' => $safetyHint,
            'wasteRisk' => $wasteRisk,
            'estimatedClaims' => $estimatedClaims,
            'estimatedKg' => $estimatedKg,
            'co2eKg' => $co2eKg,
            'maxClaimPerUser' => $maxClaimPerUser,
            'confidence' => $matched ? 90 : 80,
            'reasons' => [
                "Jenis makanan dikenali sebagai {$hit['foodType']}",
                "Estimasi porsi sekitar {$qty} {$hit['unit']}",
                "Waktu aman dikonsumsi sekitar {$safeHours} jam",
                "Saran maksimal klaim {$maxClaimPerUser} {$hit['unit']}/orang",
            ],
            'checks' => [
                'Jenis makanan dikenali',
                'Estimasi porsi',
                'Estimasi waktu aman',
                'Saran batas klaim',
                'Deskripsi dibuat otomatis',
            ],
            'tip' => $tip,
            'summary' => $tip,
        ];
    }
}
