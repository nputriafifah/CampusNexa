# CampusNexa API (Laravel)

Backend API untuk CampusNexa — Sanctum token auth + SQLite.

## Setup

```bash
cd backend
composer install
cp .env.example .env   # sudah ada .env dari scaffold
php artisan key:generate
php artisan migrate:fresh --seed
php artisan storage:link
php artisan serve
```

API: `http://127.0.0.1:8000/api`

## Demo login

| Email | Password |
|-------|----------|
| `afifahputri177@student.uns.ac.id` | `campusloop` |
| `rafi@student.ac.id` | `campusloop` |

## Endpoint utama

- `POST /api/register` `POST /api/login` `POST /api/logout` `GET /api/me`
- `GET/POST /api/items` `GET /api/items/{id}` `PATCH /api/items/{id}/status`
- `POST /api/items/{id}/interests`
- `GET/POST /api/borrows` + respond / return / remind
- `GET/POST /api/foods` `POST /api/foods/{id}/claim`
- `POST /api/donations/{id}/claim` `POST /api/donations/{id}/handover`
- `GET /api/impact` `GET /api/notifications`
- `POST /api/ai/analyze-item` `POST /api/ai/predict-food`

## Frontend

Di root project, file `.env`:

```
VITE_API_URL=http://127.0.0.1:8000/api
```

Lalu `npm run dev`.
