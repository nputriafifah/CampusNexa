<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->string('group')->default('resource')->after('slug');
            $table->boolean('is_active')->default(true)->after('group');
        });

        Schema::create('platform_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->json('value');
            $table->timestamps();
        });

        $defaults = [
            ['Barang Bekas', 'resource'],
            ['Preloved', 'resource'],
            ['Donasi Barang', 'resource'],
            ['Tukar Barang', 'resource'],
            ['Pinjam Barang', 'resource'],
            ['Aksi Komunitas', 'community'],
            ['Bersih Kampus', 'community'],
            ['Donasi Buku', 'community'],
            ['Workshop Kampus', 'community'],
            ['Penanaman Pohon', 'community'],
            ['Selamatkan Makanan', 'food_rescue'],
            ['Sampah Elektronik', 'ewaste'],
        ];

        foreach ($defaults as [$name, $group]) {
            if (! DB::table('categories')->where('name', $name)->exists()) {
                DB::table('categories')->insert([
                    'name' => $name,
                    'slug' => Str::slug($name),
                    'group' => $group,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        DB::table('categories')->whereNull('group')->update(['group' => 'resource']);

        DB::table('platform_settings')->insert([
            'key' => 'ai',
            'value' => json_encode([
                'item_prompt' => 'Analisis barang kampus dari judul, deskripsi, dan nama file. Tentukan kategori, kondisi, tipe listing, dan estimasi harga.',
                'food_prompt' => 'Prediksi risiko food waste, window pengambilan, dan estimasi kg makanan terselamatkan.',
                'description_template' => 'Terdeteksi kemungkinan {category} kondisi {condition}. Cocok sebagai listing {listingType}.',
                'price_elektronik' => 75000,
                'price_default' => 25000,
                'keyword_map' => [
                    ['keys' => ['kalkulator', 'casio', 'mouse', 'laptop', 'charger', 'headset', 'flashdisk', 'usb', 'tripod'], 'category' => 'Elektronik', 'condition' => 'Baik', 'listingType' => 'sell'],
                    ['keys' => ['buku', 'modul', 'novel', 'algoritma', 'kalkulus', 'kamus'], 'category' => 'Buku', 'condition' => 'Sangat Baik', 'listingType' => 'borrow'],
                    ['keys' => ['hoodie', 'jaket', 'kaos', 'sepatu', 'tas', 'celana'], 'category' => 'Pakaian', 'condition' => 'Baik', 'listingType' => 'donate'],
                ],
            ], JSON_THROW_ON_ERROR),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_settings');

        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn(['group', 'is_active']);
        });
    }
};
