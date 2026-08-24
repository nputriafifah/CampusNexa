<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Food;
use App\Models\FoodClaim;
use App\Services\AiMockService;
use App\Services\ImpactService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FoodController extends Controller
{
    public function index(Request $request)
    {
        $uniId = $request->user()?->university_id;
        Food::refreshOpenPickupWindows($uniId);
        Food::expireEmptyPastFoods($uniId);

        $query = Food::query()->with(['claims', 'user'])->latest();

        if ($uniId) {
            $query->where('university_id', $uniId);
        }

        $foods = $query->get()->map(
            fn (Food $food) => $food->toApiArray($request->user()?->id)
        );

        return response()->json(['data' => $foods]);
    }

    public function show(Request $request, Food $food)
    {
        $this->ensureCampusAccess($request, $food);
        $this->expireIfPast($food);
        $food->load(['claims', 'user']);

        return response()->json([
            'data' => $food->toApiArray($request->user()?->id),
        ]);
    }

    public function store(Request $request, ImpactService $impact)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:190'],
            'description' => ['nullable', 'string'],
            'quantity' => ['required', 'integer', 'min:1'],
            'unit' => ['nullable', 'string', 'max:30'],
            'max_claim_per_user' => ['nullable', 'integer', 'min:1', 'max:20'],
            'location' => ['required', 'string', 'max:190'],
            'pickup_until' => ['required', 'date'],
            'organization' => ['nullable', 'string', 'max:190'],
            'image' => ['nullable', 'image', 'max:3072'],
            'image_url' => ['nullable', 'url'],
        ]);

        abort_unless($request->user()->university_id, 422, 'Akun belum terhubung ke universitas');

        $path = null;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('foods', 'public');
        } elseif (! empty($data['image_url'])) {
            $path = $data['image_url'];
        } else {
            $path = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';
        }

        $food = Food::create([
            'university_id' => $request->user()->university_id,
            'user_id' => $request->user()->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'quantity' => $data['quantity'],
            'remaining' => $data['quantity'],
            'price' => 0,
            'unit' => $data['unit'] ?? 'porsi',
            'max_claim_per_user' => $data['max_claim_per_user'] ?? 2,
            'location' => $data['location'],
            'pickup_until' => $data['pickup_until'],
            'organization' => $data['organization'] ?? $request->user()->name,
            'status' => 'available',
            'image' => $path,
        ]);

        $impact->notify(
            $request->user(),
            'Food Rescue dipublish',
            "\"{$food->title}\" siap diklaim di {$food->location}.",
            'food'
        );

        return response()->json(['data' => $food->toApiArray($request->user()->id)], 201);
    }

    public function claim(Request $request, Food $food, ImpactService $impact)
    {
        $data = $request->validate([
            'quantity' => ['nullable', 'integer', 'min:1'],
        ]);

        $qty = $data['quantity'] ?? 1;
        $user = $request->user();

        return DB::transaction(function () use ($request, $food, $impact, $qty, $user) {
            $locked = Food::query()->whereKey($food->id)->lockForUpdate()->firstOrFail();
            $locked->loadMissing('user');

            $this->ensureCampusAccess($request, $locked);

            if ((int) $locked->user_id === (int) $user->id) {
                return response()->json(['message' => 'Tidak bisa klaim makanan sendiri'], 422);
            }

            if ($locked->pickup_until->isPast()) {
                $locked->update(['status' => 'expired']);

                return response()->json(['message' => 'Waktu pickup sudah habis'], 422);
            }

            if ($locked->status !== 'available' || $locked->remaining < $qty) {
                return response()->json(['message' => 'Kuota tersisa tidak cukup'], 422);
            }

            $already = (int) FoodClaim::where('food_id', $locked->id)
                ->where('user_id', $user->id)
                ->where('status', '!=', 'cancelled')
                ->sum('quantity');

            if ($already + $qty > $locked->max_claim_per_user) {
                return response()->json([
                    'message' => "Batas klaim {$locked->max_claim_per_user} {$locked->unit}/orang",
                ], 422);
            }

            FoodClaim::create([
                'food_id' => $locked->id,
                'user_id' => $user->id,
                'quantity' => $qty,
                'status' => 'reserved',
            ]);

            $locked->decrement('remaining', $qty);
            $locked->refresh();

            if ($locked->remaining <= 0) {
                $locked->update(['status' => 'claimed']);
            }

            $kg = round($qty * 0.35, 1);
            $impact->record($user, 'food_rescued', $locked, 0, $kg, $kg, $qty * 15000);
            $impact->notify(
                $user,
                'Berhasil ambil makanan',
                "Kamu klaim {$qty} {$locked->unit} \"{$locked->title}\". Ambil sebelum batas waktu ya.",
                'food',
                '/app/food/'.$locked->id
            );

            if ($locked->user && (int) $locked->user_id !== (int) $user->id) {
                $impact->notify(
                    $locked->user,
                    'Ada yang ambil makananmu',
                    "{$user->name} klaim {$qty} {$locked->unit} dari \"{$locked->title}\".",
                    'food',
                    '/app/food/'.$locked->id
                );
            }

            return response()->json([
                'message' => "Berhasil klaim {$qty} {$locked->unit}",
                'data' => $locked->fresh(['claims', 'user'])->toApiArray($user->id),
            ]);
        });
    }

    public function cancelClaim(Request $request, Food $food, ImpactService $impact)
    {
        $user = $request->user();
        $userId = (int) $user->id;

        return DB::transaction(function () use ($request, $food, $impact, $user, $userId) {
            $locked = Food::query()->whereKey($food->id)->lockForUpdate()->firstOrFail();
            $locked->loadMissing('user');
            $this->ensureCampusAccess($request, $locked);

            $claims = FoodClaim::query()
                ->where('food_id', $locked->id)
                ->where('user_id', $userId)
                ->where('status', 'reserved')
                ->lockForUpdate()
                ->get();

            if ($claims->isEmpty()) {
                return response()->json(['message' => 'Tidak ada klaim yang bisa dibatalkan'], 422);
            }

            if ($locked->pickup_until->isPast()) {
                return response()->json(['message' => 'Sudah lewat batas pengambilan'], 422);
            }

            $qty = (int) $claims->sum('quantity');
            foreach ($claims as $claim) {
                $claim->update(['status' => 'cancelled']);
            }

            $locked->increment('remaining', $qty);
            $locked->refresh();

            if ($locked->status === 'claimed' && $locked->remaining > 0) {
                $locked->update(['status' => 'available']);
            }

            $kg = round($qty * 0.35, 1);
            $impact->reverseFoodRescue($user, $locked, $kg, $kg, $qty * 15000);

            $impact->notify(
                $user,
                'Klaim dibatalkan',
                "Klaim \"{$locked->title}\" ({$qty} {$locked->unit}) dibatalkan.",
                'food',
                '/app/food/'.$locked->id
            );

            if ($locked->user && (int) $locked->user_id !== $userId) {
                $impact->notify(
                    $locked->user,
                    'Klaim dibatalkan',
                    "{$user->name} membatalkan klaim {$qty} {$locked->unit} dari \"{$locked->title}\".",
                    'food',
                    '/app/food/'.$locked->id
                );
            }

            return response()->json([
                'message' => 'Klaim dibatalkan',
                'data' => $locked->fresh(['claims', 'user'])->toApiArray($userId),
            ]);
        });
    }

    public function predict(Request $request, AiMockService $ai)
    {
        $data = $request->validate([
            'title' => ['nullable', 'string'],
            'quantity' => ['nullable', 'integer', 'min:1'],
            'file_name' => ['nullable', 'string'],
        ]);

        return response()->json([
            'data' => $ai->analyzeFood(
                $data['title'] ?? '',
                (int) ($data['quantity'] ?? 10),
                $data['file_name'] ?? '',
            ),
        ]);
    }

    protected function ensureCampusAccess(Request $request, Food $food): void
    {
        $uid = $request->user()?->university_id;
        if ($uid && $food->university_id && (int) $food->university_id !== (int) $uid) {
            abort(403, 'Makanan dari kampus lain');
        }
    }

    protected function expireIfPast(Food $food): void
    {
        if (
            $food->status === 'available'
            && $food->pickup_until
            && $food->pickup_until->isPast()
            && (int) $food->remaining <= 0
        ) {
            $food->update(['status' => 'expired']);
            $food->refresh();
        } elseif (
            (int) $food->remaining > 0
            && (
                $food->status === 'expired'
                || ($food->pickup_until && $food->pickup_until->isPast())
            )
        ) {
            Food::refreshOpenPickupWindows($food->university_id);
            $food->refresh();
        }
    }

    protected function expirePastFoods(?int $universityId): void
    {
        Food::expireEmptyPastFoods($universityId);
    }
}
