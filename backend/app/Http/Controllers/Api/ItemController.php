<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Item;
use App\Models\ItemFavorite;
use App\Models\ItemInterest;
use App\Models\ItemInterestReply;
use App\Services\AiMockService;
use App\Services\ImpactService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ItemController extends Controller
{
    public function index(Request $request)
    {
        $userId = (int) $request->user()->id;
        $query = Item::query()
            ->with(['owner', 'category', 'claimer'])
            ->withCount('interests')
            ->withExists([
                'interests as my_interest' => fn ($q) => $q->where('user_id', $userId),
            ])
            ->latest();

        if ($request->filled('listing_type') && $request->listing_type !== 'all') {
            $query->where('listing_type', $request->listing_type);
        }

        if ($request->filled('category') && $request->category !== 'Semua') {
            $query->whereHas('category', fn ($q) => $q->where('name', $request->category));
        }

        if ($request->filled('q')) {
            $q = $request->q;
            $query->where(function ($builder) use ($q) {
                $builder->where('title', 'like', "%{$q}%")
                    ->orWhere('description', 'like', "%{$q}%");
            });
        }

        return response()->json([
            'data' => $query->get()->map(fn (Item $item) => $item->toApiArray($userId)),
        ]);
    }

    public function show(Request $request, Item $item)
    {
        $item->load(['owner', 'category', 'claimer', 'interests.user', 'interests.replies.user']);
        $item->loadCount('interests');

        $userId = (int) $request->user()->id;
        $isOwner = $userId === (int) $item->user_id;

        // Chat privat: pemilik lihat semua thread, peminat hanya thread miliknya
        $interests = $isOwner
            ? $item->interests
            : $item->interests->where('user_id', $userId)->values();

        return response()->json([
            'data' => $item->toApiArray($userId),
            'interests' => $interests->map(
                fn (ItemInterest $interest) => $interest->toApiArray($isOwner)
            )->values(),
        ]);
    }

    public function store(Request $request, AiMockService $ai, ImpactService $impact)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:190'],
            'description' => ['nullable', 'string'],
            'category' => ['nullable', 'string', 'max:100'],
            'condition' => ['nullable', 'string', 'max:50'],
            'listing_type' => ['required', 'in:sell,exchange,borrow,donate'],
            'price' => ['nullable', 'integer', 'min:0'],
            'looking_for' => ['nullable', 'string', 'max:190'],
            'location' => ['nullable', 'string', 'max:190'],
            'tags' => ['nullable', 'array'],
            'image' => ['nullable', 'image', 'max:3072'],
            'image_url' => ['nullable', 'url'],
        ]);

        if ($data['listing_type'] === 'sell' && empty($data['price'])) {
            return response()->json(['message' => 'Harga wajib diisi untuk listing Sell.'], 422);
        }

        if ($data['listing_type'] === 'exchange' && empty($data['looking_for'])) {
            return response()->json(['message' => 'Isi Looking for untuk listing Exchange.'], 422);
        }

        $category = null;
        if (! empty($data['category'])) {
            $category = Category::resolveActiveResource($data['category']);
            if (! $category) {
                return response()->json([
                    'message' => 'Kategori tidak valid atau sudah nonaktif. Pilih dari daftar kategori platform.',
                ], 422);
            }
        }

        $path = null;
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('items', 'public');
        } elseif (! empty($data['image_url'])) {
            $path = $data['image_url'];
        }

        $item = Item::create([
            'user_id' => $request->user()->id,
            'category_id' => $category?->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'condition' => $data['condition'] ?? 'Baik',
            'listing_type' => $data['listing_type'],
            'price' => $data['listing_type'] === 'sell' ? (int) ($data['price'] ?? 0) : 0,
            'looking_for' => $data['listing_type'] === 'exchange' ? ($data['looking_for'] ?? null) : null,
            'location' => $data['location'] ?? null,
            'status' => 'available',
            'image' => $path,
            'tags' => $data['tags'] ?? [],
        ]);

        $analysis = $ai->analyzeItem($item->title, (string) $item->description);
        $item->aiAnalyses()->create([
            'user_id' => $request->user()->id,
            'detected_category' => $analysis['category'] ?? null,
            'condition' => $analysis['condition'] ?? null,
            'recommendation' => $analysis['listingType'] ?? null,
            'generated_description' => $analysis['summary'] ?? ($analysis['description'] ?? null),
            'payload' => $analysis,
            'confidence' => $analysis['confidence'] ?? null,
        ]);

        $impact->notify(
            $request->user(),
            'Listing dipublish',
            "\"{$item->title}\" sekarang terlihat di kampus.",
            $item->listing_type
        );

        return response()->json(['data' => $item->fresh(['owner', 'category'])->loadCount('interests')->toApiArray((int) $request->user()->id)], 201);
    }

    public function destroy(Request $request, Item $item)
    {
        abort_unless((int) $item->user_id === (int) $request->user()->id, 403);

        if ($item->image && ! str_starts_with($item->image, 'http')) {
            Storage::disk('public')->delete($item->image);
        }

        $item->delete();

        return response()->json(['message' => 'Listing dihapus.']);
    }

    public function updateStatus(Request $request, Item $item, ImpactService $impact)
    {
        abort_unless($item->user_id === $request->user()->id, 403);

        $data = $request->validate([
            'status' => ['required', 'in:available,reserved,sold,borrowed,donated,exchanged,closed'],
        ]);

        $item->update(['status' => $data['status']]);

        if ($data['status'] === 'exchanged') {
            $impact->record($request->user(), 'exchange', $item, 1, 0, 1, 50000);
            $impact->notify($request->user(), 'Exchange selesai', 'Tukar selesai. Dampakmu bertambah.', 'exchange');
        }

        if ($data['status'] === 'sold') {
            $impact->record($request->user(), 'sell', $item, 1, 0, 1, (int) $item->price);
            $impact->notify($request->user(), 'Barang terjual', 'Transaksi selesai. Dampakmu bertambah.', 'sell');
        }

        return response()->json(['data' => $item->fresh(['owner', 'category', 'claimer'])->loadCount('interests')->toApiArray((int) $request->user()->id)]);
    }

    public function sendInterest(Request $request, Item $item, ImpactService $impact)
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'max:1000'],
        ]);

        $interest = ItemInterest::create([
            'item_id' => $item->id,
            'user_id' => $request->user()->id,
            'message' => $data['message'],
        ]);

        if ($item->owner) {
            $impact->notify(
                $item->owner,
                'Minat baru',
                "{$request->user()->name} tertarik pada \"{$item->title}\".",
                'exchange',
                '/app/exchange/'.$item->id.'#item-chat'
            );
        }

        $impact->notify(
            $request->user(),
            'Minat terkirim',
            "Pesanmu untuk \"{$item->title}\" sudah dikirim ke pemilik.",
            'exchange',
            '/app/exchange/'.$item->id.'#item-chat'
        );

        return response()->json(['data' => $interest->load(['user', 'replies.user'])->toApiArray()], 201);
    }

    public function replyInterest(Request $request, ItemInterest $interest, ImpactService $impact)
    {
        $interest->load('item');
        $item = $interest->item;
        abort_unless($item, 404);

        $userId = (int) $request->user()->id;
        $isOwner = $userId === (int) $item->user_id;
        $isBuyer = $userId === (int) $interest->user_id;
        abort_unless($isOwner || $isBuyer, 403);

        $data = $request->validate([
            'message' => ['required', 'string', 'max:1000'],
        ]);

        $reply = ItemInterestReply::create([
            'item_interest_id' => $interest->id,
            'user_id' => $userId,
            'message' => $data['message'],
        ]);

        $recipient = $isOwner ? $interest->user : $item->owner;
        if ($recipient && $recipient->id !== $userId) {
            $impact->notify(
                $recipient,
                'Balasan baru',
                "{$request->user()->name} membalas chat di \"{$item->title}\".",
                'exchange',
                '/app/exchange/'.$item->id.'#item-chat'
            );
        }

        return response()->json([
            'data' => $reply->toApiArray(),
            'interest' => $interest->fresh(['user', 'replies.user'])->toApiArray($isOwner),
        ], 201);
    }

    public function toggleFavorite(Request $request, Item $item)
    {
        $userId = (int) $request->user()->id;

        $existing = ItemFavorite::query()
            ->where('user_id', $userId)
            ->where('item_id', $item->id)
            ->first();

        if ($existing) {
            $existing->delete();
            $favorited = false;
        } else {
            ItemFavorite::create([
                'user_id' => $userId,
                'item_id' => $item->id,
            ]);
            $favorited = true;
        }

        $favorites = ItemFavorite::query()
            ->where('user_id', $userId)
            ->orderByDesc('id')
            ->pluck('item_id')
            ->map(fn ($id) => (string) $id)
            ->values();

        return response()->json([
            'favorited' => $favorited,
            'favorites' => $favorites,
        ]);
    }
}
