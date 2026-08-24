<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Category;
use App\Models\CommunityEvent;
use App\Models\CommunityEventRegistration;
use App\Models\CommunityVolunteer;
use App\Models\CommunityVolunteerSignup;
use App\Models\Food;
use App\Models\ImpactLog;
use App\Models\Item;
use App\Models\Organization;
use App\Models\PlatformSetting;
use App\Services\AiMockService;
use App\Models\University;
use App\Models\User;
use App\Services\ImpactService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function overview(Request $request)
    {
        $user = $request->user();
        abort_unless($user->role === 'campus_admin', 403, 'Hanya admin kampus');
        $campusOnly = true;
        abort_unless($user->university_id, 422, 'Admin belum terhubung ke universitas');

        $userFilter = function ($q) use ($campusOnly, $user) {
            if ($campusOnly) {
                $q->where('university_id', $user->university_id);
            }
        };

        $usersBase = User::query()->tap($userFilter);
        $itemsBase = Item::query()->when(
            $campusOnly,
            fn ($q) => $q->whereHas('owner', fn ($o) => $o->where('university_id', $user->university_id))
        );
        $foodsBase = Food::query()->when(
            $campusOnly,
            fn ($q) => $q->where('university_id', $user->university_id)
        );
        $impactBase = ImpactLog::query()->when(
            $campusOnly,
            fn ($q) => $q->where('university_id', $user->university_id)
        );

        $eventsBase = CommunityEvent::query()->when(
            $campusOnly,
            fn ($q) => $q->where('university_id', $user->university_id)
        );
        $volunteersBase = CommunityVolunteer::query()->when(
            $campusOnly,
            fn ($q) => $q->where('university_id', $user->university_id)
        );
        $orgsBase = Organization::query()->when(
            $campusOnly,
            fn ($q) => $q->where('university_id', $user->university_id)
        );

        $recentItems = (clone $itemsBase)
            ->with(['owner', 'category'])
            ->latest()
            ->limit(6)
            ->get()
            ->map->toApiArray()
            ->values();

        $itemsStuck = (clone $itemsBase)
            ->with(['owner', 'category'])
            ->where('status', 'reserved')
            ->where('updated_at', '<', now()->subDays(3))
            ->latest('updated_at')
            ->limit(8)
            ->get()
            ->map->toApiArray()
            ->values();

        $foodsExpiring = (clone $foodsBase)
            ->with('user')
            ->where('status', 'available')
            ->whereNotNull('pickup_until')
            ->whereBetween('pickup_until', [now(), now()->addDay()])
            ->orderBy('pickup_until')
            ->limit(6)
            ->get()
            ->map(fn (Food $food) => $food->toApiArray())
            ->values();

        $foodsOverdue = (clone $foodsBase)
            ->with('user')
            ->where('status', 'available')
            ->whereNotNull('pickup_until')
            ->where('pickup_until', '<', now())
            ->orderBy('pickup_until')
            ->limit(6)
            ->get()
            ->map(fn (Food $food) => $food->toApiArray())
            ->values();

        $recentFoods = (clone $foodsBase)
            ->with('user')
            ->latest()
            ->limit(4)
            ->get()
            ->map(fn (Food $food) => $food->toApiArray())
            ->values();

        $recentEvents = (clone $eventsBase)
            ->latest()
            ->limit(4)
            ->get()
            ->map(fn (CommunityEvent $event) => $event->toApiArray())
            ->values();

        $recentAnnouncements = Announcement::query()
            ->when($campusOnly, fn ($q) => $q->where('university_id', $user->university_id))
            ->latest()
            ->limit(4)
            ->get()
            ->map->toApiArray()
            ->values();

        $pendingVolunteerSignups = (int) CommunityVolunteerSignup::query()
            ->where('status', 'pending')
            ->whereHas('volunteer', function ($q) use ($campusOnly, $user) {
                if ($campusOnly) {
                    $q->where('university_id', $user->university_id);
                }
            })
            ->count();

        $wasteReducedKg = round((float) (clone $impactBase)->sum('waste_reduced_kg'), 1);
        $foodRescuedKg = round((float) (clone $impactBase)->sum('food_rescued_kg'), 1);
        $itemsSaved = (int) (clone $impactBase)->sum('items_saved');
        $co2Kg = round(($wasteReducedKg * 1.8) + ($foodRescuedKg * 2.5) + ($itemsSaved * 0.8), 1);

        try {
            $topCategories = (clone $itemsBase)
                ->join('categories', 'items.category_id', '=', 'categories.id')
                ->select('categories.name', DB::raw('COUNT(items.id) as total'))
                ->groupBy('categories.id', 'categories.name')
                ->orderByDesc('total')
                ->limit(6)
                ->get()
                ->map(fn ($row) => [
                    'name' => $row->name,
                    'count' => (int) $row->total,
                ])
                ->values();
        } catch (\Throwable) {
            $topCategories = collect();
        }

        $periodStats = function (int $days) use ($impactBase, $itemsBase, $foodsBase, $eventsBase, $volunteersBase) {
            $since = now()->subDays($days);
            $impact = (clone $impactBase)->where('created_at', '>=', $since);

            $itemsSaved = (int) (clone $impact)->sum('items_saved');
            $foodRescuedKg = round((float) (clone $impact)->sum('food_rescued_kg'), 1);
            $wasteReducedKg = round((float) (clone $impact)->sum('waste_reduced_kg'), 1);
            $co2Kg = round(($wasteReducedKg * 1.8) + ($foodRescuedKg * 2.5) + ($itemsSaved * 0.8), 1);

            return [
                'days' => $days,
                'itemsSaved' => $itemsSaved,
                'foodRescuedKg' => $foodRescuedKg,
                'wasteReducedKg' => $wasteReducedKg,
                'co2AvoidedKg' => $co2Kg,
                'moneySaved' => (int) (clone $impact)->sum('money_saved'),
                'newListings' => (int) (clone $itemsBase)->where('created_at', '>=', $since)->count(),
                'newFoods' => (int) (clone $foodsBase)->where('created_at', '>=', $since)->count(),
                'newEvents' => (int) (clone $eventsBase)->where('created_at', '>=', $since)->count(),
                'newVolunteers' => (int) (clone $volunteersBase)->where('created_at', '>=', $since)->count(),
                'closedListings' => (int) (clone $itemsBase)
                    ->where('updated_at', '>=', $since)
                    ->whereIn('status', ['sold', 'donated', 'exchanged', 'borrowed'])
                    ->count(),
            ];
        };

        $topOrganizations = $this->topOrganizationsRanked($user->university_id, 6);

        return response()->json([
            'scope' => $campusOnly ? 'campus' : 'global',
            'university' => $user->university?->only(['id', 'name', 'code', 'city', 'status']),
            'stats' => [
                'users' => (int) (clone $usersBase)->count(),
                'students' => (int) (clone $usersBase)->where('role', 'student')->count(),
                'campusAdmins' => (int) (clone $usersBase)->where('role', 'campus_admin')->count(),
                'items' => (int) (clone $itemsBase)->count(),
                'itemsAvailable' => (int) (clone $itemsBase)->where('status', 'available')->count(),
                'itemsSell' => (int) (clone $itemsBase)->whereIn('listing_type', ['sell', 'exchange'])->count(),
                'itemsBorrow' => (int) (clone $itemsBase)->where('listing_type', 'borrow')->count(),
                'itemsDonate' => (int) (clone $itemsBase)->where('listing_type', 'donate')->count(),
                'foods' => (int) (clone $foodsBase)->count(),
                'foodsAvailable' => (int) (clone $foodsBase)->where('status', 'available')->count(),
                'foodsExpired' => (int) (clone $foodsBase)->where('status', 'expired')->count(),
                'events' => (int) (clone $eventsBase)->count(),
                'eventsOpen' => (int) (clone $eventsBase)->where('status', 'open')->count(),
                'volunteers' => (int) (clone $volunteersBase)->count(),
                'volunteersOpen' => (int) (clone $volunteersBase)->where('status', 'open')->count(),
                'organizations' => (int) (clone $orgsBase)->count(),
                'itemsSaved' => $itemsSaved,
                'foodRescuedKg' => $foodRescuedKg,
                'wasteReducedKg' => $wasteReducedKg,
                'co2AvoidedKg' => $co2Kg,
                'moneySaved' => (int) (clone $impactBase)->sum('money_saved'),
                'universities' => $campusOnly ? 1 : University::count(),
                'pendingVolunteerSignups' => $pendingVolunteerSignups,
                'attentionCount' => $itemsStuck->count() + $foodsExpiring->count() + $foodsOverdue->count(),
            ],
            'topCategories' => $topCategories,
            'topOrganizations' => $topOrganizations,
            'period' => [
                'week' => $periodStats(7),
                'month' => $periodStats(30),
            ],
            'attention' => [
                'itemsStuck' => $itemsStuck,
                'foodsExpiring' => $foodsExpiring,
                'foodsOverdue' => $foodsOverdue,
            ],
            'recentItems' => $recentItems,
            'recentFoods' => $recentFoods,
            'recentEvents' => $recentEvents,
            'recentAnnouncements' => $recentAnnouncements,
        ]);
    }

    public function users(Request $request)
    {
        $actor = $request->user();
        abort_unless($actor->role === 'campus_admin', 403, 'Hanya admin kampus');
        abort_unless($actor->university_id, 422, 'Admin belum terhubung ke universitas');

        $query = User::query()->with('university')->latest();

        $query->where('university_id', $actor->university_id)
            ->whereIn('role', ['student', 'campus_admin']);

        if ($request->filled('role') && $request->role !== 'all') {
            $query->where('role', $request->role);
        }

        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(function ($b) use ($q) {
                $b->where('name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%");
            });
        }

        if ($request->filled('account_status') && $request->account_status !== 'all') {
            if ($request->account_status === 'active') {
                $query->where(function ($b) {
                    $b->where('account_status', 'active')->orWhereNull('account_status');
                });
            } else {
                $query->where('account_status', $request->account_status);
            }
        }

        return response()->json([
            'data' => $query->limit(100)->get()->map->toApiArray(),
        ]);
    }

    public function showUser(Request $request, User $user)
    {
        $actor = $request->user();

        if ($actor->role === 'campus_admin') {
            abort_unless($user->university_id === $actor->university_id, 403);
            abort_unless(in_array($user->role, ['student', 'campus_admin'], true), 403);
        }

        $user->load(['university', 'organization']);

        $itemsQuery = Item::query()->where('user_id', $user->id);
        $foodsQuery = Food::query()->where('user_id', $user->id);

        $recentItems = (clone $itemsQuery)
            ->with(['owner', 'category'])
            ->latest()
            ->limit(5)
            ->get()
            ->map->toApiArray()
            ->values();

        return response()->json([
            'data' => array_merge($user->toApiArray(), [
                'stats' => [
                    'itemsTotal' => (int) (clone $itemsQuery)->count(),
                    'itemsAvailable' => (int) (clone $itemsQuery)->where('status', 'available')->count(),
                    'foodsTotal' => (int) (clone $foodsQuery)->count(),
                    'foodsAvailable' => (int) (clone $foodsQuery)->where('status', 'available')->count(),
                ],
                'recentItems' => $recentItems,
            ]),
        ]);
    }

    public function updateUserRole(Request $request, User $user)
    {
        $actor = $request->user();

        $data = $request->validate([
            'role' => ['required', Rule::in(['student', 'campus_admin', 'super_admin'])],
        ]);

        if ($actor->role === 'campus_admin') {
            abort_unless($user->university_id === $actor->university_id, 403);
            abort_unless(in_array($data['role'], ['student', 'campus_admin'], true), 403);
            abort_if($user->role === 'super_admin', 403);
        }

        abort_if($user->id === $actor->id && $data['role'] !== $actor->role, 422, 'Tidak bisa mengubah role sendiri');

        if ($data['role'] === 'campus_admin' && ! $user->university_id) {
            abort(422, 'User harus terhubung ke universitas sebelum dijadikan admin kampus');
        }

        $user->update(['role' => $data['role']]);

        return response()->json(['data' => $user->fresh('university')->toApiArray()]);
    }

    public function updateUserStatus(Request $request, User $user)
    {
        $actor = $request->user();

        $data = $request->validate([
            'account_status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        abort_if($user->id === $actor->id, 422, 'Tidak bisa menonaktifkan akun sendiri');

        if ($actor->role === 'campus_admin') {
            abort_unless($user->university_id === $actor->university_id, 403);
            abort_unless(in_array($user->role, ['student', 'campus_admin'], true), 403);
            abort_if($user->role === 'super_admin', 403);
        }

        $user->update(['account_status' => $data['account_status']]);

        if ($data['account_status'] === 'inactive') {
            $user->tokens()->delete();
        }

        return response()->json(['data' => $user->fresh('university')->toApiArray()]);
    }

    public function items(Request $request)
    {
        $actor = $request->user();
        $query = Item::query()->with(['owner.university', 'category', 'claimer'])->latest();

        if ($actor->role === 'campus_admin') {
            $query->whereHas('owner', fn ($q) => $q->where('university_id', $actor->university_id));
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('listing_type') && $request->listing_type !== 'all') {
            $query->where('listing_type', $request->listing_type);
        }

        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(function ($b) use ($q) {
                $b->where('title', 'like', "%{$q}%")
                    ->orWhere('location', 'like', "%{$q}%")
                    ->orWhereHas('owner', fn ($o) => $o->where('name', 'like', "%{$q}%"));
            });
        }

        return response()->json([
            'data' => $query->limit(100)->get()->map->toApiArray(),
        ]);
    }

    public function moderateItem(Request $request, Item $item)
    {
        $actor = $request->user();

        if ($actor->role === 'campus_admin') {
            $item->loadMissing('owner');
            abort_unless($item->owner?->university_id === $actor->university_id, 403);
        }

        $data = $request->validate([
            'status' => ['required', Rule::in(['available', 'reserved', 'sold', 'borrowed', 'donated', 'exchanged'])],
        ]);

        $item->update(['status' => $data['status']]);

        return response()->json(['data' => $item->fresh(['owner', 'category', 'claimer'])->toApiArray()]);
    }

    public function destroyItem(Request $request, Item $item)
    {
        $actor = $request->user();

        if ($actor->role === 'campus_admin') {
            $item->loadMissing('owner');
            abort_unless($item->owner?->university_id === $actor->university_id, 403);
        }

        $item->delete();

        return response()->json(['ok' => true]);
    }

    public function foods(Request $request)
    {
        $actor = $request->user();
        $query = Food::query()->with('user')->latest();

        if ($actor->role === 'campus_admin') {
            $query->where('university_id', $actor->university_id);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(function ($b) use ($q) {
                $b->where('title', 'like', "%{$q}%")
                    ->orWhere('location', 'like', "%{$q}%")
                    ->orWhere('organization', 'like', "%{$q}%")
                    ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$q}%"));
            });
        }

        return response()->json([
            'data' => $query->limit(100)->get()->map(
                fn (Food $food) => $food->toApiArray()
            ),
        ]);
    }

    public function moderateFood(Request $request, Food $food)
    {
        $actor = $request->user();

        if ($actor->role === 'campus_admin') {
            abort_unless($food->university_id === $actor->university_id, 403);
        }

        $data = $request->validate([
            'status' => ['required', Rule::in(['available', 'claimed', 'expired'])],
        ]);

        $food->update(['status' => $data['status']]);

        return response()->json(['data' => $food->fresh()->toApiArray()]);
    }

    public function destroyFood(Request $request, Food $food)
    {
        $actor = $request->user();

        if ($actor->role === 'campus_admin') {
            abort_unless($food->university_id === $actor->university_id, 403);
        }

        $food->delete();

        return response()->json(['ok' => true]);
    }

    public function storeFood(Request $request)
    {
        $actor = $request->user();
        abort_unless($actor->university_id, 422, 'Admin belum terhubung ke universitas');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:190'],
            'description' => ['nullable', 'string'],
            'quantity' => ['required', 'integer', 'min:1'],
            'unit' => ['nullable', 'string', 'max:30'],
            'max_claim_per_user' => ['nullable', 'integer', 'min:1', 'max:20'],
            'location' => ['required', 'string', 'max:190'],
            'pickup_until' => ['required', 'date'],
            'organization_id' => ['nullable', 'exists:organizations,id'],
            'organization' => ['nullable', 'string', 'max:190'],
            'image' => ['nullable', 'image', 'max:3072'],
            'image_url' => ['nullable', 'url'],
        ]);

        $orgName = $data['organization'] ?? null;
        if (! empty($data['organization_id'])) {
            $org = Organization::query()
                ->whereKey($data['organization_id'])
                ->where('university_id', $actor->university_id)
                ->firstOrFail();
            $orgName = $org->name;
        }
        abort_unless($orgName, 422, 'Penyelenggara wajib');

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('foods', 'public');
        } elseif (! empty($data['image_url'])) {
            $imagePath = $data['image_url'];
        } else {
            $imagePath = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';
        }

        $food = Food::create([
            'university_id' => $actor->university_id,
            'user_id' => $actor->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'quantity' => $data['quantity'],
            'remaining' => $data['quantity'],
            'price' => 0,
            'unit' => $data['unit'] ?? 'porsi',
            'max_claim_per_user' => $data['max_claim_per_user'] ?? 2,
            'location' => $data['location'],
            'pickup_until' => $data['pickup_until'],
            'organization' => $orgName,
            'status' => 'available',
            'image' => $imagePath,
        ]);

        return response()->json(['data' => $food->toApiArray()], 201);
    }

    public function updateFood(Request $request, Food $food)
    {
        $actor = $request->user();
        if ($actor->role === 'campus_admin') {
            abort_unless($food->university_id === $actor->university_id, 403);
        }

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:190'],
            'description' => ['nullable', 'string'],
            'quantity' => ['sometimes', 'integer', 'min:1'],
            'unit' => ['nullable', 'string', 'max:30'],
            'max_claim_per_user' => ['nullable', 'integer', 'min:1', 'max:20'],
            'location' => ['sometimes', 'string', 'max:190'],
            'pickup_until' => ['sometimes', 'date'],
            'organization_id' => ['nullable', 'exists:organizations,id'],
            'organization' => ['nullable', 'string', 'max:190'],
            'status' => ['sometimes', Rule::in(['available', 'claimed', 'expired'])],
            'image' => ['nullable', 'image', 'max:3072'],
            'image_url' => ['nullable', 'url'],
        ]);

        if (! empty($data['organization_id'])) {
            $org = Organization::query()
                ->whereKey($data['organization_id'])
                ->where('university_id', $food->university_id)
                ->firstOrFail();
            $data['organization'] = $org->name;
        }
        unset($data['organization_id']);

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('foods', 'public');
        } elseif (array_key_exists('image_url', $data)) {
            if ($data['image_url']) {
                $data['image'] = $data['image_url'];
            }
        }
        unset($data['image_url']);

        if (isset($data['quantity'])) {
            $claimed = max(0, $food->quantity - $food->remaining);
            $data['remaining'] = max(0, $data['quantity'] - $claimed);
        }

        $food->update($data);

        return response()->json(['data' => $food->fresh()->toApiArray()]);
    }

    public function organizations(Request $request)
    {
        $actor = $request->user();
        $query = Organization::query()->latest();

        if ($actor->role === 'campus_admin') {
            $query->where('university_id', $actor->university_id);
        }

        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(function ($b) use ($q) {
                $b->where('name', 'like', "%{$q}%")
                    ->orWhere('description', 'like', "%{$q}%");
            });
        }

        return response()->json([
            'data' => $query->get()->map(fn (Organization $org) => $org->toApiArray(true)),
        ]);
    }

    public function showOrganization(Request $request, Organization $organization)
    {
        $actor = $request->user();
        if ($actor->role === 'campus_admin') {
            abort_unless($organization->university_id === $actor->university_id, 403);
        }

        $name = $organization->name;
        $uniId = $organization->university_id;

        $recentMembers = User::query()
            ->where('organization_id', $organization->id)
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (User $u) => [
                'id' => (string) $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'faculty' => $u->faculty,
                'studyProgram' => $u->study_program,
            ])
            ->values();

        $recentFoods = Food::query()
            ->where('university_id', $uniId)
            ->where('organization', $name)
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (Food $food) => $food->toApiArray())
            ->values();

        $recentEvents = CommunityEvent::query()
            ->where('university_id', $uniId)
            ->where('organizer', $name)
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (CommunityEvent $event) => $event->toApiArray())
            ->values();

        $recentVolunteers = CommunityVolunteer::query()
            ->where('university_id', $uniId)
            ->where('organizer', $name)
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (CommunityVolunteer $volunteer) => $volunteer->toApiArray())
            ->values();

        return response()->json([
            'data' => array_merge($organization->toApiArray(true), [
                'recentMembers' => $recentMembers,
                'recentFoods' => $recentFoods,
                'recentEvents' => $recentEvents,
                'recentVolunteers' => $recentVolunteers,
            ]),
        ]);
    }

    public function storeOrganization(Request $request)
    {
        $actor = $request->user();
        abort_unless($actor->university_id, 422, 'Admin belum terhubung ke universitas');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:190'],
            'type' => ['required', Rule::in(['BEM', 'HIMA', 'UKM', 'kantin', 'other'])],
            'description' => ['nullable', 'string'],
        ]);

        $duplicate = Organization::query()
            ->where('university_id', $actor->university_id)
            ->where('name', $data['name'])
            ->exists();
        abort_if($duplicate, 422, 'Nama organisasi sudah ada di kampus ini');

        $org = Organization::create([
            'university_id' => $actor->university_id,
            'name' => $data['name'],
            'type' => $data['type'],
            'description' => $data['description'] ?? null,
        ]);

        return response()->json(['data' => $org->toApiArray(true)], 201);
    }

    public function updateOrganization(Request $request, Organization $organization)
    {
        $actor = $request->user();
        if ($actor->role === 'campus_admin') {
            abort_unless($organization->university_id === $actor->university_id, 403);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:190'],
            'type' => ['sometimes', Rule::in(['BEM', 'HIMA', 'UKM', 'kantin', 'other'])],
            'description' => ['nullable', 'string'],
        ]);

        if (! empty($data['name']) && $data['name'] !== $organization->name) {
            $duplicate = Organization::query()
                ->where('university_id', $organization->university_id)
                ->where('name', $data['name'])
                ->where('id', '!=', $organization->id)
                ->exists();
            abort_if($duplicate, 422, 'Nama organisasi sudah ada di kampus ini');
        }

        $oldName = $organization->name;
        $organization->update($data);

        if (! empty($data['name']) && $data['name'] !== $oldName) {
            $organization->syncNameReferences($oldName, $data['name']);
        }

        return response()->json(['data' => $organization->fresh()->toApiArray(true)]);
    }

    public function destroyOrganization(Request $request, Organization $organization)
    {
        $actor = $request->user();
        if ($actor->role === 'campus_admin') {
            abort_unless($organization->university_id === $actor->university_id, 403);
        }

        $stats = $organization->usageStats();
        $inUse = ($stats['members'] ?? 0) + ($stats['items'] ?? 0) + ($stats['foods'] ?? 0)
            + ($stats['events'] ?? 0) + ($stats['volunteers'] ?? 0);

        abort_if($inUse > 0, 422, sprintf(
            'Organisasi masih dipakai (%d anggota, %d listing, %d food, %d event, %d relawan). Lepaskan anggota atau hapus posting terkait dulu.',
            $stats['members'],
            $stats['items'],
            $stats['foods'],
            $stats['events'],
            $stats['volunteers'],
        ));

        $organization->delete();

        return response()->json(['ok' => true]);
    }

    public function announcements(Request $request)
    {
        $actor = $request->user();
        $query = Announcement::query()->with('author')->latest();

        if ($actor->role === 'campus_admin') {
            $query->where('university_id', $actor->university_id);
        }

        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(function ($b) use ($q) {
                $b->where('title', 'like', "%{$q}%")
                    ->orWhere('body', 'like', "%{$q}%");
            });
        }

        if ($request->filled('status') && $request->status !== 'all') {
            if ($request->status === 'published') {
                $query->whereNotNull('published_at');
            } elseif ($request->status === 'draft') {
                $query->whereNull('published_at');
            }
        }

        return response()->json([
            'data' => $query->limit(50)->get()->map->toApiArray(),
        ]);
    }

    public function storeAnnouncement(Request $request)
    {
        $actor = $request->user();
        abort_unless($actor->university_id, 422, 'Admin belum terhubung ke universitas');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:190'],
            'body' => ['required', 'string'],
            'publish' => ['sometimes', 'boolean'],
        ]);

        $announcement = Announcement::create([
            'university_id' => $actor->university_id,
            'user_id' => $actor->id,
            'title' => $data['title'],
            'body' => $data['body'],
            'published_at' => ($data['publish'] ?? true) ? now() : null,
        ]);

        if ($announcement->published_at) {
            $this->notifyStudentsAboutAnnouncement($announcement);
        }

        return response()->json(['data' => $announcement->load('author')->toApiArray()], 201);
    }

    public function updateAnnouncement(Request $request, Announcement $announcement)
    {
        $actor = $request->user();
        if ($actor->role === 'campus_admin') {
            abort_unless($announcement->university_id === $actor->university_id, 403);
        }

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:190'],
            'body' => ['sometimes', 'string'],
            'publish' => ['sometimes', 'boolean'],
        ]);

        $wasPublished = $announcement->published_at !== null;

        if (array_key_exists('publish', $data)) {
            $announcement->published_at = $data['publish'] ? ($announcement->published_at ?: now()) : null;
            unset($data['publish']);
        }

        $announcement->update($data);
        $announcement->refresh();

        if (! $wasPublished && $announcement->published_at !== null) {
            $this->notifyStudentsAboutAnnouncement($announcement);
        }

        return response()->json(['data' => $announcement->fresh('author')->toApiArray()]);
    }

    public function destroyAnnouncement(Request $request, Announcement $announcement)
    {
        $actor = $request->user();
        if ($actor->role === 'campus_admin') {
            abort_unless($announcement->university_id === $actor->university_id, 403);
        }

        $announcement->delete();

        return response()->json(['ok' => true]);
    }

    protected function notifyStudentsAboutAnnouncement(Announcement $announcement): void
    {
        $impact = app(ImpactService::class);
        $preview = Str::limit(preg_replace('/\s+/', ' ', trim($announcement->body)), 140);
        $link = '/app/announcements#'.$announcement->id;

        User::query()
            ->where('university_id', $announcement->university_id)
            ->where('role', 'student')
            ->where(function ($q) {
                $q->where('account_status', 'active')->orWhereNull('account_status');
            })
            ->select(['id'])
            ->chunkById(100, function ($users) use ($impact, $announcement, $preview, $link) {
                foreach ($users as $user) {
                    $impact->notify(
                        $user,
                        'Pengumuman kampus',
                        $announcement->title.' — '.$preview,
                        'announcement',
                        $link,
                    );
                }
            });
    }

    public function eventRegistrations(Request $request, CommunityEvent $event)
    {
        $this->assertCommunityCampus($request, $event->university_id);

        $rows = CommunityEventRegistration::query()
            ->with('user')
            ->where('event_id', $event->id)
            ->where('status', 'registered')
            ->latest()
            ->get()
            ->map(fn (CommunityEventRegistration $r) => [
                'id' => $r->id,
                'status' => $r->status,
                'userName' => $r->user?->name,
                'userEmail' => $r->user?->email,
                'createdAt' => optional($r->created_at)?->toISOString(),
            ]);

        return response()->json(['data' => $rows]);
    }

    public function volunteerSignups(Request $request, CommunityVolunteer $volunteer)
    {
        $this->assertCommunityCampus($request, $volunteer->university_id);

        $rows = CommunityVolunteerSignup::query()
            ->with('user')
            ->where('volunteer_id', $volunteer->id)
            ->whereIn('status', ['pending', 'approved', 'rejected'])
            ->latest()
            ->get()
            ->map(fn (CommunityVolunteerSignup $r) => [
                'id' => $r->id,
                'status' => $r->status,
                'userName' => $r->user?->name,
                'userEmail' => $r->user?->email,
                'createdAt' => optional($r->created_at)?->toISOString(),
            ]);

        return response()->json(['data' => $rows]);
    }

    public function updateVolunteerSignup(Request $request, CommunityVolunteerSignup $signup)
    {
        $signup->load(['volunteer', 'user']);
        abort_unless($signup->volunteer, 404);
        $this->assertCommunityCampus($request, $signup->volunteer->university_id);

        $data = $request->validate([
            'status' => ['required', Rule::in(['pending', 'approved', 'rejected'])],
        ]);

        if ($data['status'] === 'approved') {
            $active = $signup->volunteer->signups()
                ->whereIn('status', ['pending', 'approved'])
                ->where('id', '!=', $signup->id)
                ->count();
            abort_if($active >= $signup->volunteer->quota, 422, 'Kuota relawan sudah penuh');
        }

        $signup->update(['status' => $data['status']]);

        return response()->json([
            'data' => [
                'id' => $signup->id,
                'status' => $signup->status,
                'userName' => $signup->user?->name,
                'userEmail' => $signup->user?->email,
            ],
        ]);
    }

    public function universities(Request $request)
    {
        $query = University::query()
            ->withCount([
                'users as students_count' => fn ($q) => $q->where('role', 'student'),
                'users as campus_admins_count' => fn ($q) => $q->where('role', 'campus_admin'),
                'users',
            ])
            ->latest();

        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(function ($b) use ($q) {
                $b->where('name', 'like', "%{$q}%")
                    ->orWhere('code', 'like', "%{$q}%")
                    ->orWhere('city', 'like', "%{$q}%");
            });
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        return response()->json([
            'data' => $query->get()->map(fn (University $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'code' => $u->code,
                'city' => $u->city,
                'status' => $u->status,
                'logo' => $u->logo,
                'usersCount' => $u->users_count,
                'studentsCount' => (int) $u->students_count,
                'campusAdminsCount' => (int) $u->campus_admins_count,
                'hasCampusAdmin' => (int) $u->campus_admins_count > 0,
                'createdAt' => optional($u->created_at)?->toISOString(),
            ]),
        ]);
    }

    public function storeUniversity(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:190'],
            'code' => ['required', 'string', 'max:32', 'unique:universities,code'],
            'city' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
        ]);

        $uni = University::create([
            'name' => $data['name'],
            'code' => strtoupper($data['code']),
            'city' => $data['city'] ?? null,
            'status' => $data['status'] ?? 'active',
        ]);

        return response()->json([
            'data' => [
                'id' => $uni->id,
                'name' => $uni->name,
                'code' => $uni->code,
                'city' => $uni->city,
                'status' => $uni->status,
                'usersCount' => 0,
            ],
        ], 201);
    }

    public function updateUniversity(Request $request, University $university)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:190'],
            'code' => ['sometimes', 'string', 'max:32', Rule::unique('universities', 'code')->ignore($university->id)],
            'city' => ['nullable', 'string', 'max:120'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ]);

        if (isset($data['code'])) {
            $data['code'] = strtoupper($data['code']);
        }

        $university->update($data);

        return response()->json([
            'data' => [
                'id' => $university->id,
                'name' => $university->name,
                'code' => $university->code,
                'city' => $university->city,
                'status' => $university->status,
                'usersCount' => $university->users()->count(),
            ],
        ]);
    }

    public function createCampusAdmin(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'university_id' => ['required', 'exists:universities,id'],
        ]);

        $admin = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'university_id' => $data['university_id'],
            'role' => 'campus_admin',
            'avatar' => collect(explode(' ', $data['name']))->map(fn ($p) => mb_substr($p, 0, 1))->take(2)->implode(''),
        ]);

        return response()->json(['data' => $admin->load('university')->toApiArray()], 201);
    }

    public function campusAdmins(Request $request)
    {
        $query = User::query()->with('university')->where('role', 'campus_admin')->latest();

        if ($request->filled('university_id') && $request->university_id !== 'all') {
            $query->where('university_id', $request->university_id);
        }

        if ($request->filled('account_status') && $request->account_status !== 'all') {
            if ($request->account_status === 'active') {
                $query->where(function ($b) {
                    $b->where('account_status', 'active')->orWhereNull('account_status');
                });
            } else {
                $query->where('account_status', 'inactive');
            }
        }

        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(function ($b) use ($q) {
                $b->where('name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%")
                    ->orWhereHas('university', function ($u) use ($q) {
                        $u->where('name', 'like', "%{$q}%")
                            ->orWhere('code', 'like', "%{$q}%");
                    });
            });
        }

        return response()->json([
            'data' => $query->limit(100)->get()->map->toApiArray(),
        ]);
    }

    public function destroyUniversity(University $university)
    {
        $users = $university->users()->count();
        $orgs = $university->organizations()->count();
        $foods = Food::query()->where('university_id', $university->id)->count();
        $events = CommunityEvent::query()->where('university_id', $university->id)->count();

        abort_if($users + $orgs + $foods + $events > 0, 422, sprintf(
            'Universitas masih dipakai (%d pengguna, %d organisasi, %d makanan, %d acara). Kosongkan dulu.',
            $users,
            $orgs,
            $foods,
            $events,
        ));

        $university->delete();

        return response()->json(['ok' => true]);
    }

    public function updateCampusAdmin(Request $request, User $user)
    {
        abort_unless($user->role === 'campus_admin', 422, 'Bukan admin kampus');

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'email', 'max:190', Rule::unique('users', 'email')->ignore($user->id)],
            'university_id' => ['sometimes', 'exists:universities,id'],
            'whatsapp' => ['nullable', 'string', 'max:30'],
            'account_status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ]);

        if (! empty($data['name'])) {
            $user->name = trim($data['name']);
            $user->avatar = collect(explode(' ', $user->name))
                ->map(fn ($p) => mb_substr($p, 0, 1))
                ->take(2)
                ->implode('');
        }

        if (! empty($data['email'])) {
            $user->email = strtolower(trim($data['email']));
        }

        if (array_key_exists('university_id', $data)) {
            $user->university_id = $data['university_id'];
        }

        if (array_key_exists('whatsapp', $data)) {
            $user->whatsapp = $data['whatsapp'] ? trim($data['whatsapp']) : null;
        }

        if (array_key_exists('account_status', $data)) {
            $user->account_status = $data['account_status'];
            if ($data['account_status'] === 'inactive') {
                $user->tokens()->delete();
            }
        }

        $user->save();

        return response()->json(['data' => $user->fresh('university')->toApiArray()]);
    }

    public function resetCampusAdminPassword(Request $request, User $user)
    {
        abort_unless($user->role === 'campus_admin', 422, 'Bukan admin kampus');

        $data = $request->validate([
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $user->password = $data['password'];
        $user->save();
        $user->tokens()->delete();

        return response()->json(['ok' => true, 'message' => 'Password admin direset']);
    }

    public function destroyCampusAdmin(Request $request, User $user)
    {
        abort_unless($user->role === 'campus_admin', 422, 'Bukan admin kampus');
        abort_if($user->id === $request->user()->id, 422, 'Tidak bisa hapus akun sendiri');

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['ok' => true]);
    }

    public function adminCategories(Request $request)
    {
        $query = Category::query()->withCount('items')->orderBy('group')->orderBy('name');

        if ($request->filled('group') && $request->group !== 'all') {
            $query->where('group', $request->group);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            if ($request->status === 'active') {
                $query->where('is_active', true);
            } else {
                $query->where('is_active', false);
            }
        }

        if ($request->filled('q')) {
            $q = $request->q;
            $query->where('name', 'like', "%{$q}%");
        }

        return response()->json([
            'data' => $query->get()->map->toApiArray(),
        ]);
    }

    public function storeCategory(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:categories,name'],
            'group' => ['required', Rule::in(['resource', 'community', 'food_rescue', 'ewaste'])],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $category = Category::create([
            'name' => trim($data['name']),
            'slug' => Str::slug($data['name']),
            'group' => $data['group'],
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json(['data' => $category->toApiArray()], 201);
    }

    public function updateCategory(Request $request, Category $category)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:100', Rule::unique('categories', 'name')->ignore($category->id)],
            'group' => ['sometimes', Rule::in(['resource', 'community', 'food_rescue', 'ewaste'])],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('group', $data) && $data['group'] !== $category->group) {
            abort_if($category->items()->exists(), 422, 'Grup tidak bisa diubah — kategori masih dipakai barang.');
        }

        if (! empty($data['name'])) {
            $category->name = trim($data['name']);
            $category->slug = Str::slug($category->name);
        }

        if (array_key_exists('group', $data)) {
            $category->group = $data['group'];
        }

        if (array_key_exists('is_active', $data)) {
            $category->is_active = $data['is_active'];
        }

        $category->save();

        return response()->json(['data' => $category->fresh()->toApiArray()]);
    }

    public function destroyCategory(Category $category)
    {
        abort_if($category->items()->exists(), 422, 'Kategori masih dipakai barang. Nonaktifkan saja.');

        $category->delete();

        return response()->json(['ok' => true]);
    }

    public function aiSettings()
    {
        $defaults = AiMockService::platformDefaults();
        $stored = PlatformSetting::getJson('ai', []);
        $settings = array_merge($defaults, $stored);

        if (empty($stored['keyword_map'])) {
            $settings['keyword_map'] = $defaults['keyword_map'];
        }

        return response()->json(['data' => $settings]);
    }

    public function updateAiSettings(Request $request)
    {
        $data = $request->validate([
            'item_prompt' => ['nullable', 'string', 'max:2000'],
            'food_prompt' => ['nullable', 'string', 'max:2000'],
            'description_template' => ['nullable', 'string', 'max:500'],
            'price_elektronik' => ['nullable', 'integer', 'min:0'],
            'price_default' => ['nullable', 'integer', 'min:0'],
            'keyword_map' => ['nullable', 'array'],
            'keyword_map.*.keys' => ['required', 'array'],
            'keyword_map.*.category' => ['required', 'string', 'max:100'],
            'keyword_map.*.condition' => ['nullable', 'string', 'max:50'],
            'keyword_map.*.listingType' => ['nullable', 'string', 'max:30'],
        ]);

        PlatformSetting::putJson('ai', $data);

        return response()->json(['data' => $data, 'message' => 'Pengaturan AI disimpan']);
    }

    public function campusSummary(Request $request)
    {
        $user = $request->user();
        abort_unless($user->role === 'campus_admin', 403, 'Hanya admin kampus');
        abort_unless($user->university_id, 422, 'Admin belum terhubung ke universitas');

        $uniId = (int) $user->university_id;

        return response()->json([
            'university' => $user->university?->only(['id', 'name', 'code', 'city', 'status']),
            'stats' => [
                'students' => User::query()->where('university_id', $uniId)->where('role', 'student')->count(),
                'items' => Item::query()->whereHas('owner', fn ($q) => $q->where('university_id', $uniId))->count(),
                'foods' => Food::query()->where('university_id', $uniId)->count(),
            ],
        ]);
    }

    public function nationalAnalytics(ImpactService $impact)
    {
        $data = Cache::remember('admin:national-analytics:v2', 60, function () use ($impact) {
            return $this->buildNationalAnalyticsPayload($impact);
        });

        return response()->json(['data' => $data]);
    }

    public function community(Request $request)
    {
        $actor = $request->user();
        $events = CommunityEvent::query()
            ->when($actor->role === 'campus_admin', fn ($q) => $q->where('university_id', $actor->university_id))
            ->orderByDesc('starts_at')
            ->limit(100)
            ->get()
            ->map(fn (CommunityEvent $e) => $e->toApiArray());

        $volunteers = CommunityVolunteer::query()
            ->when($actor->role === 'campus_admin', fn ($q) => $q->where('university_id', $actor->university_id))
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (CommunityVolunteer $v) => $v->toApiArray());

        return response()->json([
            'data' => [
                'events' => $events,
                'volunteers' => $volunteers,
            ],
        ]);
    }

    public function storeEvent(Request $request)
    {
        $actor = $request->user();
        abort_unless($actor->university_id, 422, 'Admin belum terhubung ke universitas');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:190'],
            'description' => ['nullable', 'string'],
            'location' => ['required', 'string', 'max:190'],
            'organizer' => ['required', 'string', 'max:190'],
            'whatsapp_url' => ['nullable', 'url', 'max:500'],
            'contact_note' => ['nullable', 'string', 'max:255'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'quota' => ['required', 'integer', 'min:1', 'max:500'],
        ]);

        $uniId = $actor->university_id;

        $event = CommunityEvent::create([
            'university_id' => $uniId,
            'created_by' => $actor->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'location' => $data['location'],
            'organizer' => $data['organizer'],
            'whatsapp_url' => $data['whatsapp_url'] ?? null,
            'contact_note' => $data['contact_note'] ?? null,
            'starts_at' => $data['starts_at'],
            'ends_at' => $data['ends_at'] ?? null,
            'quota' => $data['quota'],
            'status' => 'open',
        ]);

        return response()->json(['data' => $event->toApiArray()], 201);
    }

    public function updateEvent(Request $request, CommunityEvent $event)
    {
        $this->assertCommunityCampus($request, $event->university_id);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:190'],
            'description' => ['nullable', 'string'],
            'location' => ['sometimes', 'string', 'max:190'],
            'organizer' => ['sometimes', 'string', 'max:190'],
            'whatsapp_url' => ['nullable', 'url', 'max:500'],
            'contact_note' => ['nullable', 'string', 'max:255'],
            'starts_at' => ['sometimes', 'date'],
            'ends_at' => ['nullable', 'date'],
            'quota' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'status' => ['sometimes', Rule::in(['open', 'closed'])],
        ]);

        $event->update($data);

        return response()->json(['data' => $event->fresh()->toApiArray()]);
    }

    public function destroyEvent(Request $request, CommunityEvent $event)
    {
        $this->assertCommunityCampus($request, $event->university_id);

        $volunteerCount = CommunityVolunteer::query()->where('event_id', $event->id)->count();
        abort_if($volunteerCount > 0, 422, sprintf(
            'Acara masih punya %d lowongan relawan terkait. Hapus lowongan dulu.',
            $volunteerCount,
        ));

        $registrationCount = $event->registrations()->where('status', 'registered')->count();
        abort_if($registrationCount > 0, 422, sprintf(
            'Acara masih punya %d pendaftar aktif. Tutup acara dulu.',
            $registrationCount,
        ));

        $event->delete();

        return response()->json(['ok' => true]);
    }

    public function storeVolunteer(Request $request)
    {
        $actor = $request->user();
        abort_unless($actor->university_id, 422, 'Admin belum terhubung ke universitas');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:190'],
            'description' => ['nullable', 'string'],
            'location' => ['required', 'string', 'max:190'],
            'organizer' => ['required', 'string', 'max:190'],
            'whatsapp_url' => ['nullable', 'url', 'max:500'],
            'contact_note' => ['nullable', 'string', 'max:255'],
            'starts_at' => ['required', 'date'],
            'quota' => ['required', 'integer', 'min:1', 'max:500'],
            'event_id' => ['required', 'exists:community_events,id'],
        ]);

        $uniId = $actor->university_id;

        $event = CommunityEvent::query()->whereKey($data['event_id'])->firstOrFail();
        abort_unless((int) $event->university_id === (int) $uniId, 422, 'Event harus dari kampus yang sama');

        $volunteer = CommunityVolunteer::create([
            'university_id' => $uniId,
            'created_by' => $actor->id,
            'event_id' => $data['event_id'],
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'location' => $data['location'],
            'organizer' => $data['organizer'],
            'whatsapp_url' => $data['whatsapp_url'] ?? null,
            'contact_note' => $data['contact_note'] ?? null,
            'starts_at' => $data['starts_at'],
            'quota' => $data['quota'],
            'status' => 'open',
        ]);

        return response()->json(['data' => $volunteer->toApiArray()], 201);
    }

    public function updateVolunteer(Request $request, CommunityVolunteer $volunteer)
    {
        $this->assertCommunityCampus($request, $volunteer->university_id);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:190'],
            'description' => ['nullable', 'string'],
            'location' => ['sometimes', 'string', 'max:190'],
            'organizer' => ['sometimes', 'string', 'max:190'],
            'whatsapp_url' => ['nullable', 'url', 'max:500'],
            'contact_note' => ['nullable', 'string', 'max:255'],
            'starts_at' => ['sometimes', 'date'],
            'quota' => ['sometimes', 'integer', 'min:1', 'max:500'],
            'event_id' => ['sometimes', 'exists:community_events,id'],
            'status' => ['sometimes', Rule::in(['open', 'closed'])],
        ]);

        if (! empty($data['event_id'])) {
            $event = CommunityEvent::query()->whereKey($data['event_id'])->firstOrFail();
            abort_unless((int) $event->university_id === (int) $volunteer->university_id, 422, 'Event harus dari kampus yang sama');
        }

        $volunteer->update($data);

        return response()->json(['data' => $volunteer->fresh()->toApiArray()]);
    }

    public function destroyVolunteer(Request $request, CommunityVolunteer $volunteer)
    {
        $this->assertCommunityCampus($request, $volunteer->university_id);

        $signupCount = $volunteer->signups()->whereIn('status', ['pending', 'approved'])->count();
        abort_if($signupCount > 0, 422, sprintf(
            'Lowongan masih punya %d pendaftar aktif. Tutup lowongan dulu.',
            $signupCount,
        ));

        $volunteer->delete();

        return response()->json(['ok' => true]);
    }

    protected function assertCommunityCampus(Request $request, ?int $universityId): void
    {
        $actor = $request->user();
        if ($actor->role === 'campus_admin') {
            abort_unless((int) $universityId === (int) $actor->university_id, 403);
        }
    }

    protected function buildNationalAnalyticsPayload(ImpactService $impact): array
    {
        $itemsBase = Item::query();
        $foodsBase = Food::query();
        $eventsBase = CommunityEvent::query();
        $volunteersBase = CommunityVolunteer::query();
        $impactBase = ImpactLog::query();

        $impactTotals = (clone $impactBase)
            ->selectRaw('coalesce(sum(waste_reduced_kg),0) as waste, coalesce(sum(food_rescued_kg),0) as food, coalesce(sum(items_saved),0) as items_saved, coalesce(sum(money_saved),0) as money_saved')
            ->first();

        $wasteReducedKg = round((float) $impactTotals->waste, 1);
        $foodRescuedKg = round((float) $impactTotals->food, 1);
        $itemsSaved = (int) $impactTotals->items_saved;
        $co2Kg = round(($wasteReducedKg * 1.8) + ($foodRescuedKg * 2.5) + ($itemsSaved * 0.8), 1);

        $totals = [
            'universities' => University::count(),
            'campusAdmins' => User::query()->where('role', 'campus_admin')->count(),
            'students' => User::query()->where('role', 'student')->count(),
            'items' => (int) (clone $itemsBase)->count(),
            'foods' => (int) (clone $foodsBase)->count(),
            'events' => (int) (clone $eventsBase)->count(),
            'volunteers' => (int) (clone $volunteersBase)->count(),
            'itemsSaved' => $itemsSaved,
            'foodRescuedKg' => $foodRescuedKg,
            'wasteReducedKg' => $wasteReducedKg,
            'co2AvoidedKg' => $co2Kg,
            'moneySaved' => (int) $impactTotals->money_saved,
            'itemsSell' => (int) (clone $itemsBase)->whereIn('listing_type', ['sell', 'exchange'])->count(),
            'itemsBorrow' => (int) (clone $itemsBase)->where('listing_type', 'borrow')->count(),
            'itemsDonate' => (int) (clone $itemsBase)->where('listing_type', 'donate')->count(),
        ];

        try {
            $topCategories = (clone $itemsBase)
                ->join('categories', 'items.category_id', '=', 'categories.id')
                ->select('categories.name', DB::raw('COUNT(items.id) as total'))
                ->groupBy('categories.id', 'categories.name')
                ->orderByDesc('total')
                ->limit(6)
                ->get()
                ->map(fn ($row) => [
                    'name' => $row->name,
                    'count' => (int) $row->total,
                ])
                ->values();
        } catch (\Throwable) {
            $topCategories = collect();
        }

        $topOrganizations = $this->topOrganizationsRanked(null, 6);
        $byUniversity = $this->universityAnalyticsRows();

        $mapUni = fn (University $u) => [
            'id' => $u->id,
            'name' => $u->name,
            'code' => $u->code,
            'status' => $u->status,
            'city' => $u->city,
        ];

        $universitiesWithoutAdmin = University::query()
            ->whereDoesntHave('users', fn ($q) => $q->where('role', 'campus_admin'))
            ->orderBy('name')
            ->get()
            ->map($mapUni)
            ->values();

        $inactiveUniversities = University::query()
            ->where('status', 'inactive')
            ->orderBy('name')
            ->get()
            ->map($mapUni)
            ->values();

        $recentUniversities = University::query()
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (University $u) => array_merge($mapUni($u), [
                'createdAt' => optional($u->created_at)?->toISOString(),
            ]))
            ->values();

        $recentCampusAdmins = User::query()
            ->where('role', 'campus_admin')
            ->with('university:id,name,code')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'university' => $u->university?->name,
                'code' => $u->university?->code,
                'createdAt' => optional($u->created_at)?->toISOString(),
            ])
            ->values();

        return [
            'totals' => $totals,
            'byUniversity' => $byUniversity->values()->all(),
            'rankings' => [
                'mostActive' => $byUniversity->sortByDesc('activityScore')->take(5)->values()->all(),
                'mostItems' => $byUniversity->sortByDesc('items')->take(5)->values()->all(),
                'mostFoods' => $byUniversity->sortByDesc('foods')->take(5)->values()->all(),
                'mostEvents' => $byUniversity->sortByDesc('events')->take(5)->values()->all(),
                'mostVolunteers' => $byUniversity->sortByDesc('volunteers')->take(5)->values()->all(),
                'mostCo2' => $byUniversity->sortByDesc('co2AvoidedKg')->take(5)->values()->all(),
                'mostWasteReduced' => $byUniversity->sortByDesc('wasteReducedKg')->take(5)->values()->all(),
                'mostFoodRescued' => $byUniversity->sortByDesc('foodRescuedKg')->take(5)->values()->all(),
                'mostItemsSaved' => $byUniversity->sortByDesc('itemsSaved')->take(5)->values()->all(),
            ],
            'period' => [
                'week' => $this->nationalPeriodStats(7),
                'month' => $this->nationalPeriodStats(30),
            ],
            'topCategories' => collect($topCategories)->values()->all(),
            'topOrganizations' => collect($topOrganizations)->values()->all(),
            'weekly' => $impact->weekly(null),
            'attention' => [
                'universitiesWithoutAdmin' => $universitiesWithoutAdmin->values()->all(),
                'inactiveUniversities' => $inactiveUniversities->values()->all(),
            ],
            'recent' => [
                'universities' => $recentUniversities->values()->all(),
                'campusAdmins' => $recentCampusAdmins->values()->all(),
            ],
        ];
    }

    protected function nationalPeriodStats(int $days): array
    {
        $since = now()->subDays($days);
        $impact = ImpactLog::query()
            ->where('created_at', '>=', $since)
            ->selectRaw('coalesce(sum(items_saved),0) as items_saved, coalesce(sum(food_rescued_kg),0) as food_rescued_kg, coalesce(sum(waste_reduced_kg),0) as waste_reduced_kg, coalesce(sum(money_saved),0) as money_saved')
            ->first();

        $itemsSaved = (int) $impact->items_saved;
        $foodRescuedKg = round((float) $impact->food_rescued_kg, 1);
        $wasteReducedKg = round((float) $impact->waste_reduced_kg, 1);

        return [
            'days' => $days,
            'itemsSaved' => $itemsSaved,
            'foodRescuedKg' => $foodRescuedKg,
            'wasteReducedKg' => $wasteReducedKg,
            'co2AvoidedKg' => round(($wasteReducedKg * 1.8) + ($foodRescuedKg * 2.5) + ($itemsSaved * 0.8), 1),
            'moneySaved' => (int) $impact->money_saved,
            'newListings' => Item::query()->where('created_at', '>=', $since)->count(),
            'newFoods' => Food::query()->where('created_at', '>=', $since)->count(),
            'newEvents' => CommunityEvent::query()->where('created_at', '>=', $since)->count(),
            'newVolunteers' => CommunityVolunteer::query()->where('created_at', '>=', $since)->count(),
            'closedListings' => Item::query()
                ->where('updated_at', '>=', $since)
                ->whereIn('status', ['sold', 'donated', 'exchanged', 'borrowed'])
                ->count(),
        ];
    }

    protected function universityAnalyticsRows()
    {
        $universities = University::query()->orderBy('name')->get();

        $students = User::query()
            ->where('role', 'student')
            ->whereNotNull('university_id')
            ->groupBy('university_id')
            ->selectRaw('university_id, count(*) as total')
            ->pluck('total', 'university_id');

        $items = Item::query()
            ->join('users', 'items.user_id', '=', 'users.id')
            ->whereNotNull('users.university_id')
            ->groupBy('users.university_id')
            ->selectRaw('users.university_id as university_id, count(items.id) as total')
            ->pluck('total', 'university_id');

        $foods = Food::query()
            ->whereNotNull('university_id')
            ->groupBy('university_id')
            ->selectRaw('university_id, count(*) as total')
            ->pluck('total', 'university_id');

        $events = CommunityEvent::query()
            ->whereNotNull('university_id')
            ->groupBy('university_id')
            ->selectRaw('university_id, count(*) as total')
            ->pluck('total', 'university_id');

        $volunteers = CommunityVolunteer::query()
            ->whereNotNull('university_id')
            ->groupBy('university_id')
            ->selectRaw('university_id, count(*) as total')
            ->pluck('total', 'university_id');

        $impacts = ImpactLog::query()
            ->whereNotNull('university_id')
            ->groupBy('university_id')
            ->selectRaw('university_id, coalesce(sum(waste_reduced_kg),0) as waste, coalesce(sum(food_rescued_kg),0) as food, coalesce(sum(items_saved),0) as items_saved')
            ->get()
            ->keyBy('university_id');

        return $universities->map(function (University $uni) use ($students, $items, $foods, $events, $volunteers, $impacts) {
            $id = $uni->id;
            $impact = $impacts->get($id);
            $wasteReducedKg = round((float) ($impact->waste ?? 0), 1);
            $foodRescuedKg = round((float) ($impact->food ?? 0), 1);
            $itemsSaved = (int) ($impact->items_saved ?? 0);
            $studentCount = (int) ($students[$id] ?? 0);
            $itemCount = (int) ($items[$id] ?? 0);
            $foodCount = (int) ($foods[$id] ?? 0);
            $eventCount = (int) ($events[$id] ?? 0);
            $volunteerCount = (int) ($volunteers[$id] ?? 0);
            $activityScore = $studentCount + $itemCount + $foodCount + $eventCount + $volunteerCount;

            return [
                'id' => $uni->id,
                'name' => $uni->name,
                'code' => $uni->code,
                'city' => $uni->city,
                'status' => $uni->status,
                'students' => $studentCount,
                'items' => $itemCount,
                'foods' => $foodCount,
                'events' => $eventCount,
                'volunteers' => $volunteerCount,
                'activityScore' => $activityScore,
                'wasteReducedKg' => $wasteReducedKg,
                'foodRescuedKg' => $foodRescuedKg,
                'itemsSaved' => $itemsSaved,
                'co2AvoidedKg' => round(($wasteReducedKg * 1.8) + ($foodRescuedKg * 2.5) + ($itemsSaved * 0.8), 1),
            ];
        })->sortByDesc('activityScore')->values();
    }

    protected function topOrganizationsRanked(?int $universityId = null, int $limit = 6)
    {
        $query = Organization::query()->with('university:id,name,code');
        if ($universityId) {
            $query->where('university_id', $universityId);
        }

        $orgs = $query->withCount(['users as members', 'items'])->get();
        if ($orgs->isEmpty()) {
            return collect();
        }

        $foodCounts = $this->organizationNameCounts(Food::query(), 'organization', $orgs);
        $eventCounts = $this->organizationNameCounts(CommunityEvent::query(), 'organizer', $orgs);
        $volunteerCounts = $this->organizationNameCounts(CommunityVolunteer::query(), 'organizer', $orgs);

        return $orgs
            ->map(function (Organization $org) use ($foodCounts, $eventCounts, $volunteerCounts) {
                $key = $org->university_id.'|'.$org->name;
                $members = (int) $org->members;
                $items = (int) ($org->items_count ?? 0);
                $foods = (int) ($foodCounts[$key] ?? 0);
                $events = (int) ($eventCounts[$key] ?? 0);
                $volunteers = (int) ($volunteerCounts[$key] ?? 0);

                return [
                    'id' => $org->id,
                    'name' => $org->name,
                    'type' => $org->type,
                    'university' => $org->university?->name,
                    'universityCode' => $org->university?->code,
                    'members' => $members,
                    'items' => $items,
                    'foods' => $foods,
                    'events' => $events,
                    'volunteers' => $volunteers,
                    'total' => $members + $items + $foods + $events + $volunteers,
                ];
            })
            ->sortByDesc('total')
            ->take($limit)
            ->values();
    }

    protected function organizationNameCounts($baseQuery, string $column, $orgs): array
    {
        $uniIds = $orgs->pluck('university_id')->unique()->filter()->values();
        $names = $orgs->pluck('name')->unique()->filter()->values();
        if ($uniIds->isEmpty() || $names->isEmpty()) {
            return [];
        }

        return (clone $baseQuery)
            ->whereIn('university_id', $uniIds)
            ->whereIn($column, $names)
            ->selectRaw("university_id, {$column} as org_name, count(*) as total")
            ->groupBy('university_id', $column)
            ->get()
            ->mapWithKeys(fn ($row) => ["{$row->university_id}|{$row->org_name}" => (int) $row->total])
            ->all();
    }
}
