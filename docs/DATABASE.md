# CampusNexa — Day 4 Database (LOCKED)

Source of truth untuk ERD MVP. Repair **bukan** modul terpisah.

## Entities

```text
universities
users
organizations
categories
items
item_images
borrow_requests
foods
food_claims
ai_analyses
impact_logs
notifications
```

Tidak ada: `repair`, `donations`, `donation_claims`.

## Hierarchy

```text
UNIVERSITY
    ├── CAMPUS ADMIN (users.role)
    ├── ORGANIZATIONS → ITEMS
    └── USERS
            ├── ITEMS (+ item_images, borrow_requests, ai_analyses)
            ├── FOOD_CLAIMS
            └── NOTIFICATIONS
```

## Tables

### universities

| Field  | Notes                         |
| ------ | ----------------------------- |
| id     | PK                            |
| name   | Nama universitas              |
| code   | Kode (UNS, UGM, …)            |
| logo   | URL/path logo                 |
| city   | Kota                          |
| status | `active` / `inactive`         |
| timestamps |                            |

Prototype seed: **UNS — Universitas Sebelas Maret — Surakarta**.

### users

| Field           | Notes                                      |
| --------------- | ------------------------------------------ |
| id              | PK                                         |
| university_id   | FK → universities                          |
| organization_id | FK → organizations, **nullable**           |
| name            |                                            |
| email           | unique                                     |
| password        | hashed                                     |
| role            | `super_admin` / `campus_admin` / `student` |
| student_id      | NIM, nullable                              |
| faculty         |                                            |
| study_program   | Prodi                                      |
| avatar          |                                            |
| timestamps      |                                            |

Tidak ada role khusus organisasi — org lewat `organization_id` / tabel `organizations`.

### organizations

| Field         | Notes                          |
| ------------- | ------------------------------ |
| id            | PK                             |
| university_id | FK                             |
| name          |                                |
| type          | `BEM` / `HIMA` / `UKM` / other |
| logo          | nullable                       |
| description   | nullable                       |
| timestamps    |                                |

### categories

| Field | Notes |
| ----- | ----- |
| id    | PK    |
| name  | unique|

Contoh: Buku, Elektronik, Perlengkapan Kos, Alat Praktikum, Pakaian, Organisasi, Lainnya.

### items

| Field           | Notes                                              |
| --------------- | -------------------------------------------------- |
| id              | PK                                                 |
| user_id         | pemilik                                            |
| organization_id | nullable — listing atas nama org                   |
| claimer_id      | nullable — siapa yang reserve/klaim (donate/sell)  |
| category_id     | FK                                                 |
| title           |                                                    |
| description     |                                                    |
| type            | `sell` / `donate` / `exchange` / `borrow`          |
| price           | 0 jika gratis                                      |
| condition       |                                                    |
| location        |                                                    |
| status          | `available` / `reserved` / `sold` / `borrowed` / `donated` |
| timestamps      |                                                    |

**Donate flow (tanpa tabel claims):**  
`available` → klaim set `claimer_id` + `reserved` → handover → `donated`.

### item_images

| Field      | Notes        |
| ---------- | ------------ |
| id         | PK           |
| item_id    | FK           |
| image_url  | path/URL     |
| is_primary | boolean      |
| timestamps |              |

### borrow_requests

| Field       | Notes                                          |
| ----------- | ---------------------------------------------- |
| id          | PK                                             |
| item_id     | FK                                             |
| borrower_id | FK users                                       |
| owner_id    | FK users                                       |
| start_date  | nullable                                       |
| end_date    | nullable                                       |
| message     | nullable                                       |
| status      | `pending` / `approved` / `rejected` / `returned` |
| timestamps  |                                                |

### foods

| Field           | Notes                                   |
| --------------- | --------------------------------------- |
| id              | PK                                      |
| university_id   | FK — **scoped per kampus**              |
| seller_id       | FK users (`user_id` di implementasi)    |
| name            | (`title` di implementasi)               |
| description     |                                         |
| quantity        |                                         |
| price           | nullable/0 untuk gratis                 |
| pickup_location | (`location`)                            |
| available_until | (`pickup_until`)                        |
| status          | `available` / `claimed` / `expired`     |
| timestamps      |                                         |

### food_claims

| Field    | Notes                                   |
| -------- | --------------------------------------- |
| id       | PK                                      |
| food_id  | FK                                      |
| user_id  | FK                                      |
| quantity |                                         |
| status   | `reserved` / `picked_up` / `cancelled`  |
| timestamps |                                      |

### ai_analyses

| Field                 | Notes                                      |
| --------------------- | ------------------------------------------ |
| id                    | PK                                         |
| user_id               | FK                                         |
| item_id               | nullable FK                                |
| image_url             |                                            |
| detected_category     |                                            |
| condition             |                                            |
| estimated_price       |                                            |
| recommendation        | `sell` / `donate` / `borrow` / `repair`    |
| generated_description |                                            |
| created_at            |                                            |

`repair` hanya sebagai nilai recommendation — **bukan** tabel/modul.

### impact_logs

| Field            | Notes                                                |
| ---------------- | ---------------------------------------------------- |
| id               | PK                                                   |
| university_id    | FK                                                   |
| user_id          | FK                                                   |
| type             | `item_reused` / `food_rescued` / `item_donated` / `item_borrowed` |
| quantity         |                                                      |
| estimated_weight | kg                                                   |
| estimated_saving | Rupiah                                               |
| created_at       |                                                      |

### notifications

| Field      | Notes                    |
| ---------- | ------------------------ |
| id         | PK                       |
| user_id    | penerima                 |
| title      |                          |
| message    | (`body` di implementasi) |
| type       |                          |
| is_read    | / `read_at`              |
| created_at |                          |

## Relations

```text
universities 1──* users
universities 1──* organizations
universities 1──* foods
universities 1──* impact_logs

organizations 1──* users          (opsional)
organizations 1──* items          (opsional)

categories 1──* items
users 1──* items
users 1──* borrow_requests        (borrower / owner)
users 1──* foods
users 1──* food_claims
users 1──* notifications
users 1──* ai_analyses

items 1──* item_images
items 1──* borrow_requests
items 0..1──* ai_analyses
items *──0..1 claimer (users)

foods 1──* food_claims
```

## Locked decisions

1. Donate = `items.type = donate` + status/`claimer_id` — **no** `donation_claims`.
2. Food Rescue always scoped by `foods.university_id`.
3. Item status includes **`donated`** and **`reserved`**.
4. Repair stays AI-only (`ai_analyses.recommendation`).
5. Multi-university ready; prototype seed = UNS only.
