<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AppNotification;
use App\Models\BorrowRequest;
use App\Models\Category;
use App\Models\Food;
use App\Models\Item;
use App\Models\ItemFavorite;
use App\Models\Organization;
use App\Services\AiMockService;
use App\Services\ImpactService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function bootstrap(Request $request, ImpactService $impact)
    {
        $user = $request->user()->loadMissing('university');
        $userId = $user->id;
        $userPayload = $user->toApiArray();

        $items = Item::query()
            ->with(['owner', 'category', 'claimer'])
            ->withCount('interests')
            ->withExists([
                'interests as my_interest' => fn ($q) => $q->where('user_id', $userId),
            ])
            ->latest()
            ->limit(80)
            ->get()
            ->map(fn (Item $item) => $item->toApiArray($userId));

        $foodQuery = Food::query()->with('claims')->latest()->limit(40);
        if ($user->university_id) {
            $foodQuery->where('university_id', $user->university_id);
        }
        Food::refreshOpenPickupWindows($user->university_id);
        Food::expireEmptyPastFoods($user->university_id);
        $foods = $foodQuery->get()->map(fn (Food $food) => $food->toApiArray($userId));

        $borrows = BorrowRequest::with(['item', 'borrower', 'owner'])
            ->where(function ($q) use ($userId) {
                $q->where('borrower_id', $userId)->orWhere('owner_id', $userId);
            })
            ->latest()
            ->get();

        $notifications = AppNotification::query()
            ->where('user_id', $userId)
            ->latest()
            ->limit(50)
            ->get()
            ->map->toApiArray();

        $favorites = ItemFavorite::query()
            ->where('user_id', $userId)
            ->orderByDesc('id')
            ->pluck('item_id')
            ->map(fn ($id) => (string) $id)
            ->values();

        return response()->json([
            'user' => $userPayload,
            'items' => $items,
            'foods' => $foods,
            'borrows' => [
                'mine' => $borrows->where('borrower_id', $userId)->values()->map->toApiArray(),
                'incoming' => $borrows->where('owner_id', $userId)->values()->map->toApiArray(),
            ],
            'notifications' => $notifications,
            'favorites' => $favorites,
            'impact' => [
                'campus' => $impact->campusStats($user->university_id),
                'weekly' => $impact->weekly($user->university_id),
                'personal' => $userPayload['impact'],
            ],
        ]);
    }

    public function publicCampusStats(ImpactService $impact)
    {
        $campus = $impact->campusStats();

        $completedItems = Item::query()
            ->whereIn('status', ['sold', 'exchanged', 'donated'])
            ->count();

        $foodClaimedKg = round(
            (float) Food::query()
                ->get(['quantity', 'remaining'])
                ->sum(fn (Food $food) => max(($food->quantity - $food->remaining), 0) * 0.3),
            1
        );

        $itemsSaved = max($campus['itemsSaved'], $completedItems);
        $foodRescuedKg = max($campus['foodRescuedKg'], $foodClaimedKg);

        return response()->json([
            'campus' => [
                'itemsSaved' => $itemsSaved,
                'foodRescuedKg' => $foodRescuedKg,
                'wasteReducedKg' => max($campus['wasteReducedKg'], round($itemsSaved + $foodRescuedKg, 1)),
                'moneySaved' => $campus['moneySaved'],
                'activeUsers' => $campus['activeUsers'],
                'eventsHeld' => $campus['eventsHeld'] ?? 0,
                'activeVolunteers' => $campus['activeVolunteers'] ?? 0,
                'listings' => Item::count(),
            ],
        ]);
    }

    public function impact(Request $request, ImpactService $impact)
    {
        $user = $request->user();
        $uniId = $user->university_id;
        $community = $impact->communityParticipation($user);

        return response()->json([
            'campus' => $impact->campusStats($uniId),
            'weekly' => $impact->weekly($uniId),
            'personal' => $user->fresh()->toApiArray()['impact'],
            'community' => $community,
        ]);
    }

    public function announcements(Request $request)
    {
        $uniId = $request->user()->university_id;
        abort_unless($uniId, 422, 'Akun belum terhubung ke universitas');

        $rows = Announcement::query()
            ->with('author')
            ->where('university_id', $uniId)
            ->whereNotNull('published_at')
            ->latest('published_at')
            ->limit(50)
            ->get()
            ->map->toApiArray();

        return response()->json(['data' => $rows]);
    }

    public function notifications(Request $request)
    {
        $rows = AppNotification::query()
            ->where('user_id', $request->user()->id)
            ->latest()
            ->limit(50)
            ->get()
            ->map->toApiArray();

        return response()->json(['data' => $rows]);
    }

    public function markNotificationRead(Request $request, AppNotification $notification)
    {
        abort_unless($notification->user_id === $request->user()->id, 403);
        $notification->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        return response()->json(['data' => $notification->toApiArray()]);
    }

    public function markAllNotificationsRead(Request $request)
    {
        AppNotification::query()
            ->where('user_id', $request->user()->id)
            ->where(function ($q) {
                $q->where('is_read', false)->orWhereNull('read_at');
            })
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return response()->json(['message' => 'ok']);
    }

    public function categories()
    {
        return response()->json([
            'data' => Category::query()
                ->where('is_active', true)
                ->where('group', 'resource')
                ->orderBy('name')
                ->pluck('name'),
        ]);
    }

    public function campusOrganizations(Request $request)
    {
        $query = Organization::query()->orderBy('name');
        if ($request->user()?->university_id) {
            $query->where('university_id', $request->user()->university_id);
        }

        return response()->json([
            'data' => $query->get()->map(fn (Organization $org) => [
                'id' => (string) $org->id,
                'name' => $org->name,
                'type' => $org->type,
            ]),
        ]);
    }

    public function itemRecommendations(Request $request)
    {
        $user = $request->user();
        $userId = $user->id;

        $query = Item::query()
            ->with(['owner', 'category', 'claimer'])
            ->withCount('interests')
            ->withExists([
                'interests as my_interest' => fn ($q) => $q->where('user_id', $userId),
            ])
            ->where('status', 'available')
            ->where('user_id', '!=', $userId);

        if ($user->university_id) {
            $query->whereHas('owner', fn ($q) => $q->where('university_id', $user->university_id));
        }

        $facultyHay = strtolower(trim(($user->faculty ?: '').' '.($user->study_program ?? '')));
        $facultyTokens = array_values(array_filter(
            preg_split('/\s+/', $facultyHay) ?: [],
            fn ($t) => strlen($t) > 3
        ));

        $favCats = ItemFavorite::query()
            ->where('user_id', $userId)
            ->with('item.category')
            ->get()
            ->map(fn ($row) => $row->item?->category?->name)
            ->filter()
            ->countBy()
            ->all();

        $borrowed = BorrowRequest::query()
            ->where('borrower_id', $userId)
            ->with('item.category')
            ->latest()
            ->limit(20)
            ->get();

        foreach ($borrowed as $req) {
            $name = $req->item?->category?->name;
            if ($name) {
                $favCats[$name] = ($favCats[$name] ?? 0) + 1;
            }
        }

        $preferBorrow = $borrowed->isNotEmpty();

        $rows = $query->latest()->limit(40)->get()->map(function (Item $item) use ($facultyTokens, $favCats, $preferBorrow) {
            $score = 50;
            $reasons = [];
            $hay = strtolower(implode(' ', array_filter([
                $item->title,
                $item->category?->name,
                $item->location,
                $item->owner?->faculty,
                ...($item->tags ?? []),
            ])));
            $cat = $item->category?->name ?? 'Lainnya';

            $facultyHit = false;
            foreach ($facultyTokens as $token) {
                if (str_contains($hay, $token)) {
                    $facultyHit = true;
                    break;
                }
            }
            $ownerFaculty = strtolower((string) ($item->owner?->faculty ?? ''));
            $sameFaculty = false;
            foreach ($facultyTokens as $token) {
                if ($token !== '' && str_contains($ownerFaculty, $token)) {
                    $sameFaculty = true;
                    break;
                }
            }

            if ($facultyHit && $sameFaculty) {
                $score += 16;
                $reasons[] = 'fakultas sama dengan pemilik & relevan di judul/kategori';
            } elseif ($facultyHit) {
                $score += 12;
                $reasons[] = 'sesuai jurusan / fakultasmu';
            } elseif ($sameFaculty) {
                $score += 8;
                $reasons[] = 'pemilik dari fakultas yang sama';
            }

            $catHits = (int) ($favCats[$cat] ?? 0);
            if ($catHits >= 2) {
                $score += 16;
                $reasons[] = "kategori {$cat} sering kamu cari / simpan";
            } elseif ($catHits === 1) {
                $score += 10;
                $reasons[] = "kamu pernah berinteraksi dengan kategori {$cat}";
            }

            $loc = strtolower((string) $item->location);
            $near = false;
            foreach ($facultyTokens as $token) {
                if (str_contains($loc, $token)) {
                    $near = true;
                    break;
                }
            }
            if ($near) {
                $score += 12;
                $reasons[] = 'lokasi pengambilan paling dekat';
            } else {
                $score += 3 + ($item->id % 5);
            }

            if ($preferBorrow && $item->listing_type === 'borrow') {
                $score += 8;
                $reasons[] = 'sesuai histori pinjammu';
            } elseif (in_array($item->listing_type, ['borrow', 'donate'], true)) {
                $score += 3;
            }

            $condition = (string) $item->condition;
            if ($condition === 'Sangat Baik') {
                $score += 5;
                $reasons[] = 'kondisi hasil analisis foto sangat baik';
            } elseif ($condition === 'Baik') {
                $score += 3;
            }

            $percent = max(58, min(96, $score));

            return ['percent' => $percent, 'reasons' => array_values(array_unique($reasons)), 'item' => $item];
        })->sortByDesc('percent')->take(4)->values();

        return response()->json([
            'data' => $rows->map(function ($row) use ($userId) {
                $item = $row['item']->toApiArray($userId);
                $item['matchPercent'] = (int) $row['percent'];
                $item['matchReasons'] = $row['reasons'];
                $item['aiRecommended'] = true;

                return $item;
            }),
        ]);
    }

    public function analyzeItem(Request $request, AiMockService $ai)
    {
        $data = $request->validate([
            'title' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'file_name' => ['nullable', 'string'],
        ]);

        return response()->json([
            'data' => $ai->analyzeItem(
                $data['title'] ?? '',
                $data['description'] ?? '',
                $data['file_name'] ?? ''
            ),
        ]);
    }
}
