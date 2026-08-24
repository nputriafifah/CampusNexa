# CampusNexa

Platform circular economy kampus: **Resource Exchange**, **Borrow Center**, **Food Rescue**, **Donate**, dan **Impact Dashboard**.

## Stack

- **Frontend:** React 19 + Vite + Tailwind CSS 4
- **Backend:** Laravel 13 + Sanctum + SQLite

## Jalankan

### Backend API

```bash
cd backend
composer install
php artisan migrate:fresh --seed
php artisan serve
```

API: http://127.0.0.1:8000/api

### Frontend

```bash
npm install
npm run dev
```

Pastikan `.env` berisi:

```
VITE_API_URL=http://127.0.0.1:8000/api
```

## Demo login

| Role | Email | Password | Masuk ke |
|------|--------|----------|----------|
| Mahasiswa | `afifahputri177@student.uns.ac.id` | `campusloop` | `/app` |
| Campus Admin | `admin@uns.ac.id` | `campusloop` | `/admin/campus` |
| Super Admin | `superadmin@campusnexa.id` | `campusloop` | `/admin/super` |


## Struktur

| Path | Isi |
|------|-----|
| `src/` | React frontend |
| `backend/` | Laravel API |
