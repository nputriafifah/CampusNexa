<?php

namespace Database\Seeders;

use App\Models\AppNotification;
use App\Models\BorrowRequest;
use App\Models\Category;
use App\Models\Food;
use App\Models\Item;
use App\Models\University;
use App\Models\User;
use App\Models\ImpactLog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $uni = University::create([
            'name' => 'Universitas Sebelas Maret',
            'code' => 'UNS',
            'city' => 'Surakarta',
            'status' => 'active',
        ]);

        $bem = \App\Models\Organization::create([
            'university_id' => $uni->id,
            'name' => 'BEM UNS',
            'type' => 'BEM',
            'description' => 'Badan Eksekutif Mahasiswa UNS — koordinasi kegiatan lintas fakultas.',
        ]);

        $hima = \App\Models\Organization::create([
            'university_id' => $uni->id,
            'name' => 'HIMA Informatika',
            'type' => 'HIMA',
            'description' => 'Himpunan Mahasiswa Informatika.',
        ]);

        $ukm = \App\Models\Organization::create([
            'university_id' => $uni->id,
            'name' => 'UKM Green Campus',
            'type' => 'UKM',
            'description' => 'Komunitas lingkungan dan sustainability kampus.',
        ]);

        $kantin = \App\Models\Organization::create([
            'university_id' => $uni->id,
            'name' => 'Kantin Teknik',
            'type' => 'kantin',
            'description' => 'Mitra Food Rescue Fakultas Teknik.',
        ]);

        $categories = collect([
            'Buku', 'Elektronik', 'Perlengkapan Kos', 'Alat Praktikum', 'Pakaian', 'Organisasi', 'Lainnya',
        ])->mapWithKeys(function ($name) {
            $cat = Category::create([
                'name' => $name,
                'slug' => Str::slug($name),
                'group' => 'resource',
                'is_active' => true,
            ]);

            return [$name => $cat];
        });

        $alya = User::create([
            'name' => 'Afifah Putri',
            'email' => 'afifahputri177@student.uns.ac.id',
            'password' => Hash::make('campusloop'),
            'university_id' => $uni->id,
            'student_id' => 'M0123456',
            'faculty' => 'Teknik',
            'study_program' => 'Informatika',
            'avatar' => 'AP',
            'role' => 'student',
            'items_saved' => 12,
            'food_rescued_kg' => 4.5,
            'waste_reduced_kg' => 18.2,
            'money_saved' => 320000,
        ]);

        $rafi = User::create([
            'name' => 'Rafi N.',
            'email' => 'rafi@student.ac.id',
            'password' => Hash::make('campusloop'),
            'university_id' => $uni->id,
            'faculty' => 'Teknik',
            'study_program' => 'Informatika',
            'avatar' => 'RN',
            'role' => 'student',
        ]);

        $dewi = User::create([
            'name' => 'Dewi K.',
            'email' => 'dewi@student.ac.id',
            'password' => Hash::make('campusloop'),
            'university_id' => $uni->id,
            'faculty' => 'Teknik',
            'study_program' => 'Sistem Informasi',
            'avatar' => 'DK',
            'role' => 'student',
        ]);

        $sinta = User::create([
            'name' => 'Sinta M.',
            'email' => 'sinta@student.ac.id',
            'password' => Hash::make('campusloop'),
            'university_id' => $uni->id,
            'faculty' => 'Seni Rupa dan Desain',
            'study_program' => 'Desain',
            'avatar' => 'SM',
            'role' => 'student',
        ]);

        $bima = User::create([
            'name' => 'Bima S.',
            'email' => 'bima@student.ac.id',
            'password' => Hash::make('campusloop'),
            'university_id' => $uni->id,
            'avatar' => 'BS',
            'role' => 'student',
        ]);

        $andi = User::create([
            'name' => 'Andi P.',
            'email' => 'andi@student.ac.id',
            'password' => Hash::make('campusloop'),
            'university_id' => $uni->id,
            'avatar' => 'AP',
            'role' => 'student',
        ]);

        $ukm = User::create([
            'name' => 'UKM Sehat',
            'email' => 'ukmsehat@campus.ac.id',
            'password' => Hash::make('campusloop'),
            'university_id' => $uni->id,
            'organization_id' => $bem->id,
            'avatar' => 'US',
            'role' => 'student',
        ]);

        User::create([
            'name' => 'Campus Admin UNS',
            'email' => 'admin@uns.ac.id',
            'password' => Hash::make('campusloop'),
            'university_id' => $uni->id,
            'avatar' => 'CA',
            'role' => 'campus_admin',
        ]);

        User::create([
            'name' => 'Super Admin CampusNexa',
            'email' => 'superadmin@campusnexa.id',
            'password' => Hash::make('campusloop'),
            'university_id' => $uni->id,
            'avatar' => 'SA',
            'role' => 'super_admin',
        ]);

        $items = [
            [
                'user' => $rafi,
                'category' => 'Elektronik',
                'title' => 'Kalkulator Scientific Casio FX-991',
                'description' => 'Masih berfungsi sempurna, cocok buat ujian kalkulus. Ada goresan kecil di casing.',
                'condition' => 'Baik',
                'listing_type' => 'sell',
                'price' => 75000,
                'looking_for' => null,
                'location' => 'Fakultas Teknik',
                'image' => 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?auto=format&fit=crop&w=800&q=80',
                'tags' => ['kalkulus', 'ujian'],
            ],
            [
                'user' => $dewi,
                'category' => 'Buku',
                'title' => 'Buku Algoritma & Struktur Data',
                'description' => 'Edisi terbaru, highlight sedikit di bab 3–5. Siap dipinjam 2 minggu.',
                'condition' => 'Sangat Baik',
                'listing_type' => 'borrow',
                'price' => 0,
                'location' => 'Perpustakaan Pusat',
                'image' => 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80',
                'tags' => ['informatika', 'semester 3'],
            ],
            [
                'user' => $sinta,
                'category' => 'Pakaian',
                'title' => 'Jaket Hoodie Kampus Size L',
                'description' => 'Jarang dipakai, warna hitam. Donasi gratis untuk mahasiswa baru.',
                'condition' => 'Baik',
                'listing_type' => 'donate',
                'price' => 0,
                'location' => 'Asrama Putri Blok B',
                'image' => 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80',
                'tags' => ['gratis', 'hoodie'],
            ],
            [
                'user' => $bima,
                'category' => 'Elektronik',
                'title' => 'Mouse Wireless Logitech',
                'description' => 'Baterai masih awet, dongle USB ada. Tukar dengan flashdisk 16GB+',
                'condition' => 'Baik',
                'listing_type' => 'exchange',
                'price' => 0,
                'looking_for' => 'Elektronik',
                'location' => 'Lab Komputer 2',
                'image' => 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80',
                'tags' => ['tukar', 'aksesoris'],
            ],
            [
                'user' => $ukm,
                'category' => 'Organisasi',
                'title' => 'Matras Yoga',
                'description' => 'Bisa dipinjam untuk kelas olahraga / UKM. Kembalikan bersih ya.',
                'condition' => 'Baik',
                'listing_type' => 'borrow',
                'price' => 0,
                'location' => 'Gedung Olahraga',
                'status' => 'borrowed',
                'claimer_id' => null,
                'image' => 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&w=800&q=80',
                'tags' => ['ukm', 'olahraga'],
            ],
            [
                'user' => $andi,
                'category' => 'Alat Praktikum',
                'title' => 'Set Alat Gambar Teknik',
                'description' => 'Jangka, mistar, busur. Donasi untuk junior angkatan baru.',
                'condition' => 'Cukup',
                'listing_type' => 'donate',
                'price' => 0,
                'location' => 'Fakultas Teknik',
                'image' => 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80',
                'tags' => ['gambar teknik'],
            ],
            [
                'user' => $alya,
                'category' => 'Elektronik',
                'title' => 'Tripod Mini untuk Presentasi',
                'description' => 'Ringan, tinggi sampai 30cm. Bisa dipinjam untuk sidang/presentasi.',
                'condition' => 'Sangat Baik',
                'listing_type' => 'borrow',
                'price' => 0,
                'location' => 'Asrama Putri Blok A',
                'status' => 'reserved',
                'claimer_id' => null,
                'image' => 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?auto=format&fit=crop&w=800&q=80',
                'tags' => ['presentasi', 'tripod'],
            ],
        ];

        $created = [];
        foreach ($items as $row) {
            $created[] = Item::create([
                'user_id' => $row['user']->id,
                'category_id' => $categories[$row['category']]->id,
                'claimer_id' => $row['claimer_id'] ?? null,
                'title' => $row['title'],
                'description' => $row['description'],
                'condition' => $row['condition'],
                'listing_type' => $row['listing_type'],
                'price' => $row['price'],
                'looking_for' => $row['looking_for'] ?? null,
                'location' => $row['location'],
                'status' => $row['status'] ?? 'available',
                'image' => $row['image'],
                'tags' => $row['tags'],
            ]);
        }

        // Book: pending borrow by Alya
        $created[1]->update([
            'status' => 'reserved',
            'claimer_id' => $alya->id,
        ]);

        BorrowRequest::create([
            'item_id' => $created[1]->id,
            'borrower_id' => $alya->id,
            'owner_id' => $dewi->id,
            'status' => 'pending',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(14)->toDateString(),
        ]);

        BorrowRequest::create([
            'item_id' => $created[4]->id,
            'borrower_id' => $alya->id,
            'owner_id' => $ukm->id,
            'status' => 'approved',
            'start_date' => now()->subDays(3)->toDateString(),
            'end_date' => now()->addDays(4)->toDateString(),
        ]);
        $created[4]->update(['claimer_id' => $alya->id]);

        // Tripod: pending borrow by Rafi
        $created[6]->update(['claimer_id' => $rafi->id]);

        BorrowRequest::create([
            'item_id' => $created[6]->id,
            'borrower_id' => $rafi->id,
            'owner_id' => $alya->id,
            'status' => 'pending',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(14)->toDateString(),
        ]);

        Food::create([
            'university_id' => $uni->id,
            'user_id' => $alya->id,
            'title' => 'Nasi Kotak Sisa Seminar',
            'description' => '20 porsi tersisa dari seminar kewirausahaan. Ambil sebelum batas waktu.',
            'quantity' => 20,
            'remaining' => 20,
            'price' => 0,
            'unit' => 'porsi',
            'max_claim_per_user' => 2,
            'location' => 'Aula Serbaguna Lt. 2',
            'pickup_until' => now()->addHours(2),
            'organization' => 'BEM Fakultas Ekonomi',
            'status' => 'available',
            'image' => 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
        ]);

        Food::create([
            'university_id' => $uni->id,
            'user_id' => $alya->id,
            'title' => 'Roti & Pastry Kantin A',
            'description' => 'Roti manis dan croissant yang tidak terjual hari ini.',
            'quantity' => 15,
            'remaining' => 15,
            'price' => 0,
            'unit' => 'pcs',
            'max_claim_per_user' => 3,
            'location' => 'Kantin A',
            'pickup_until' => now()->addHours(3.5),
            'organization' => 'Kantin Kampus A',
            'status' => 'available',
            'image' => 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
        ]);

        Food::create([
            'university_id' => $uni->id,
            'user_id' => $ukm->id,
            'title' => 'Buah Segar Event UKM',
            'description' => 'Apel dan pisang sisa open house. Masih segar.',
            'quantity' => 8,
            'remaining' => 0,
            'price' => 0,
            'unit' => 'pack',
            'max_claim_per_user' => 2,
            'location' => 'Plaza Kampus',
            'pickup_until' => now()->subHour(),
            'organization' => 'UKM Green Campus',
            'status' => 'claimed',
            'image' => 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80',
        ]);

        AppNotification::insert([
            [
                'user_id' => $alya->id,
                'title' => 'Permintaan pinjam baru',
                'body' => 'Rafi ingin meminjam Tripod Mini milikmu.',
                'type' => 'borrow',
                'is_read' => false,
                'read_at' => null,
                'created_at' => now()->subMinutes(10),
                'updated_at' => now()->subMinutes(10),
            ],
            [
                'user_id' => $alya->id,
                'title' => 'Food Rescue tersedia',
                'body' => '20 nasi kotak di Aula Serbaguna — klaim sebelum habis waktu.',
                'type' => 'food',
                'is_read' => false,
                'read_at' => null,
                'created_at' => now()->subHour(),
                'updated_at' => now()->subHour(),
            ],
            [
                'user_id' => $alya->id,
                'title' => 'Donasi berhasil diklaim',
                'body' => 'Hoodie kampus telah diklaim oleh mahasiswa baru.',
                'type' => 'donate',
                'is_read' => true,
                'read_at' => now()->subDay(),
                'created_at' => now()->subDay(),
                'updated_at' => now()->subDay(),
            ],
        ]);

        ImpactLog::create([
            'university_id' => $uni->id,
            'user_id' => $alya->id,
            'type' => 'item_reused',
            'quantity' => 1284,
            'items_saved' => 1284,
            'estimated_weight' => 890,
            'food_rescued_kg' => 312,
            'waste_reduced_kg' => 890,
            'estimated_saving' => 48500000,
            'money_saved' => 48500000,
        ]);

        $eventBersih = \App\Models\CommunityEvent::create([
            'university_id' => $uni->id,
            'created_by' => $alya->id,
            'title' => 'Bersih Kampus UNS',
            'description' => 'Gotong royong membersihkan area fakultas dan taman kampus.',
            'location' => 'Plaza Fakultas Teknik',
            'organizer' => 'BEM UNS',
            'whatsapp_url' => 'https://chat.whatsapp.com/invite/bersih-kampus-demo',
            'contact_note' => 'CP: Humas BEM · 0812-0000-1111',
            'starts_at' => now()->addDays(3)->setTime(7, 0),
            'ends_at' => now()->addDays(3)->setTime(10, 0),
            'quota' => 40,
            'status' => 'open',
        ]);

        \App\Models\CommunityEvent::create([
            'university_id' => $uni->id,
            'created_by' => $alya->id,
            'title' => 'Donasi Buku Semester',
            'description' => 'Kumpulkan buku pelajaran & novel untuk mahasiswa baru.',
            'location' => 'Perpustakaan Pusat',
            'organizer' => 'HIMA Informatika',
            'whatsapp_url' => 'https://chat.whatsapp.com/invite/donasi-buku-demo',
            'contact_note' => 'CP: Divisi Sosial HIMA',
            'starts_at' => now()->addDays(7)->setTime(9, 0),
            'quota' => 100,
            'status' => 'open',
        ]);

        \App\Models\CommunityEvent::create([
            'university_id' => $uni->id,
            'created_by' => $alya->id,
            'title' => 'Workshop Repair Barang',
            'description' => 'Belajar memperbaiki elektronik ringan & perlengkapan kos.',
            'location' => 'Lab Maker Space',
            'organizer' => 'UKM Green Campus',
            'contact_note' => 'CP: UKM Green Campus · 0812-0000-2222',
            'starts_at' => now()->addDays(10)->setTime(13, 0),
            'quota' => 25,
            'status' => 'open',
        ]);

        \App\Models\CommunityVolunteer::create([
            'university_id' => $uni->id,
            'created_by' => $alya->id,
            'event_id' => $eventBersih->id,
            'title' => 'Relawan Bersih Kampus',
            'description' => 'Bantu koordinasi area, distribusi alat, dan dokumentasi.',
            'location' => 'Plaza Fakultas Teknik',
            'organizer' => 'BEM UNS',
            'whatsapp_url' => 'https://chat.whatsapp.com/invite/relawan-bersih-demo',
            'contact_note' => 'Join grup setelah daftar; konfirmasi hadir H-1',
            'starts_at' => now()->addDays(3)->setTime(6, 30),
            'quota' => 12,
            'status' => 'open',
        ]);

        \App\Models\CommunityVolunteer::create([
            'university_id' => $uni->id,
            'created_by' => $alya->id,
            'title' => 'Relawan Food Rescue',
            'description' => 'Bantu sortasi & distribusi makanan sisa event kampus.',
            'location' => 'Kantin A',
            'organizer' => 'UKM Sehat',
            'whatsapp_url' => 'https://wa.me/6281200002222',
            'contact_note' => 'Chat CP UKM Sehat setelah diterima',
            'starts_at' => now()->addDays(2)->setTime(16, 0),
            'quota' => 8,
            'status' => 'open',
        ]);

        \App\Models\CommunityVolunteer::create([
            'university_id' => $uni->id,
            'created_by' => $alya->id,
            'title' => 'Relawan Donasi Buku',
            'description' => 'Terima, sortasi, dan katalog buku donasi.',
            'location' => 'Perpustakaan Pusat',
            'organizer' => 'HIMA Informatika',
            'contact_note' => 'Info lanjut via email setelah diterima',
            'starts_at' => now()->addDays(7)->setTime(8, 0),
            'quota' => 15,
            'status' => 'open',
        ]);
    }
}
