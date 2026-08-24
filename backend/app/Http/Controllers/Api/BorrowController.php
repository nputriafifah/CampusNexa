<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BorrowRequest;
use App\Models\Item;
use App\Models\ItemInterest;
use App\Services\ImpactService;
use Illuminate\Http\Request;

class BorrowController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $mine = BorrowRequest::with(['item', 'borrower', 'owner'])
            ->where('borrower_id', $userId)
            ->latest()
            ->get()
            ->map->toApiArray();

        $incoming = BorrowRequest::with(['item', 'borrower', 'owner'])
            ->where('owner_id', $userId)
            ->latest()
            ->get()
            ->map->toApiArray();

        return response()->json([
            'mine' => $mine,
            'incoming' => $incoming,
        ]);
    }

    public function store(Request $request, ImpactService $impact)
    {
        $data = $request->validate([
            'item_id' => ['required'],
            'due_date' => ['nullable', 'date', 'after:today'],
            'message' => ['nullable', 'string', 'max:1000'],
        ]);

        $itemId = (int) str_replace('i', '', (string) $data['item_id']);
        $item = Item::findOrFail($itemId);

        abort_unless($item->listing_type === 'borrow', 422, 'Item bukan tipe borrow');
        abort_unless($item->status === 'available', 422, 'Item tidak tersedia');
        abort_if($item->user_id === $request->user()->id, 422, 'Tidak bisa meminjam barang sendiri');

        $endDate = $data['due_date'] ?? now()->addDays(14)->toDateString();

        $req = BorrowRequest::create([
            'item_id' => $item->id,
            'borrower_id' => $request->user()->id,
            'owner_id' => $item->user_id,
            'status' => 'pending',
            'start_date' => now()->toDateString(),
            'end_date' => $endDate,
            'message' => $data['message'] ?? null,
        ]);

        $item->update([
            'status' => 'reserved',
            'claimer_id' => $request->user()->id,
        ]);

        $location = $item->location ?: 'kampus';
        $interest = ItemInterest::firstOrCreate(
            [
                'item_id' => $item->id,
                'user_id' => $request->user()->id,
            ],
            [
                'message' => $data['message']
                    ?? "Halo, saya mau pinjam \"{$item->title}\" sampai {$endDate}. Bisa ketemu di {$location}?",
            ]
        );

        if ($item->owner) {
            $impact->notify(
                $item->owner,
                'Permintaan pinjam baru',
                "{$request->user()->name} ingin meminjam \"{$item->title}\". Setujui di Pinjam, atau balas chat.",
                'borrow',
                '/app/exchange/'.$item->id.'#item-chat'
            );
        }

        $impact->notify(
            $request->user(),
            'Permintaan pinjam dikirim',
            "Menunggu persetujuan {$item->owner?->name}. Atur ketemu lewat chat.",
            'borrow',
            '/app/exchange/'.$item->id.'#item-chat'
        );

        return response()->json([
            'data' => $req->fresh(['item', 'borrower', 'owner'])->toApiArray(),
            'interest' => $interest->load(['user', 'replies.user'])->toApiArray(),
        ], 201);
    }

    public function respond(Request $request, BorrowRequest $borrowRequest, ImpactService $impact)
    {
        abort_unless($borrowRequest->owner_id === $request->user()->id, 403);

        $data = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
        ]);

        if ($data['decision'] === 'approve') {
            $borrowRequest->update(['status' => 'approved']);
            $borrowRequest->item?->update(['status' => 'borrowed']);
            $impact->notify(
                $borrowRequest->borrower,
                'Pinjaman disetujui',
                'Barang siap diambil. Atur ketemu lewat chat, lalu kembalikan tepat waktu.',
                'borrow',
                '/app/exchange/'.$borrowRequest->item_id.'#item-chat'
            );
        } else {
            $borrowRequest->update(['status' => 'rejected']);
            $borrowRequest->item?->update([
                'status' => 'available',
                'claimer_id' => null,
            ]);
            $impact->notify(
                $borrowRequest->borrower,
                'Pinjaman ditolak',
                'Permintaan pinjam ditolak oleh pemilik.',
                'borrow',
                '/app/exchange/'.$borrowRequest->item_id
            );
        }

        return response()->json(['data' => $borrowRequest->fresh(['item', 'borrower', 'owner'])->toApiArray()]);
    }

    public function returnItem(Request $request, BorrowRequest $borrowRequest, ImpactService $impact)
    {
        abort_unless($borrowRequest->borrower_id === $request->user()->id, 403);
        abort_unless($borrowRequest->status === 'approved', 422);

        $borrowRequest->update(['status' => 'returned']);
        $borrowRequest->item?->update([
            'status' => 'available',
            'claimer_id' => null,
        ]);

        $impact->record($request->user(), 'item_borrowed', $borrowRequest, 1, 0, 0.8, 25000);
        $impact->notify(
            $request->user(),
            'Barang dikembalikan',
            'Pengembalian dicatat. Dampak kamu bertambah!',
            'borrow',
            '/app/exchange/'.$borrowRequest->item_id
        );
        if ($borrowRequest->owner) {
            $impact->notify(
                $borrowRequest->owner,
                'Barang dikembalikan',
                "{$request->user()->name} sudah mengembalikan \"{$borrowRequest->item?->title}\".",
                'borrow',
                '/app/exchange/'.$borrowRequest->item_id
            );
        }

        return response()->json(['data' => $borrowRequest->fresh(['item', 'borrower', 'owner'])->toApiArray()]);
    }

    public function remind(Request $request, BorrowRequest $borrowRequest, ImpactService $impact)
    {
        abort_unless(
            $borrowRequest->borrower_id === $request->user()->id
            || $borrowRequest->owner_id === $request->user()->id,
            403
        );

        $borrowRequest->update(['reminder_sent' => true]);
        $impact->notify(
            $borrowRequest->borrower,
            'Reminder pengembalian',
            "Jangan lupa kembalikan \"{$borrowRequest->item?->title}\" sebelum {$borrowRequest->end_date?->toDateString()}.",
            'borrow',
            '/app/exchange/'.$borrowRequest->item_id
        );

        return response()->json(['data' => $borrowRequest->fresh(['item', 'borrower', 'owner'])->toApiArray()]);
    }
}
