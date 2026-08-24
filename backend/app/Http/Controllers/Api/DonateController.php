<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\ItemInterest;
use App\Services\ImpactService;
use Illuminate\Http\Request;

class DonateController extends Controller
{
    public function claim(Request $request, Item $item, ImpactService $impact)
    {
        abort_unless($item->listing_type === 'donate', 422, 'Bukan item donasi');
        abort_unless($item->status === 'available', 422, 'Donasi tidak tersedia');
        abort_if($item->user_id === $request->user()->id, 422, 'Tidak bisa klaim donasi sendiri');

        $item->update([
            'claimer_id' => $request->user()->id,
            'status' => 'reserved',
        ]);

        $location = $item->location ?: 'lokasi kampus yang disepakati';
        $interest = ItemInterest::create([
            'item_id' => $item->id,
            'user_id' => $request->user()->id,
            'message' => "Halo, saya mengklaim donasi \"{$item->title}\". Kapan bisa ambil di {$location}? Mohon balas di chat ini.",
        ]);

        if ($item->owner) {
            $impact->notify(
                $item->owner,
                'Donasi diklaim',
                "{$request->user()->name} mengklaim \"{$item->title}\". Balas chat untuk atur serah terima.",
                'donate',
                '/app/exchange/'.$item->id.'#item-chat'
            );
        }

        $impact->notify(
            $request->user(),
            'Donasi diklaim',
            "Kamu klaim \"{$item->title}\" dari {$item->owner?->name}. Atur ketemu lewat chat di halaman barang.",
            'donate',
            '/app/exchange/'.$item->id.'#item-chat'
        );

        return response()->json([
            'message' => 'Klaim berhasil. Atur pengambilan lewat chat dengan pemberi donasi.',
            'data' => $item->fresh(['owner', 'category', 'claimer'])->loadCount('interests')->toApiArray((int) $request->user()->id),
            'interest' => $interest->load(['user', 'replies.user'])->toApiArray(),
        ]);
    }

    public function confirmHandover(Request $request, Item $item, ImpactService $impact)
    {
        abort_unless($item->claimer_id, 422, 'Tidak ada klaim');
        abort_unless(
            $item->user_id === $request->user()->id || $item->claimer_id === $request->user()->id,
            403
        );
        abort_unless($item->status === 'reserved', 422);

        $item->update(['status' => 'donated']);

        $impact->record($request->user(), 'item_donated', $item, 1, 0, 1.2, 40000);
        $impact->notify(
            $request->user(),
            'Handover selesai',
            "\"{$item->title}\" resmi tersalurkan. Impact bertambah!",
            'donate',
            '/app/exchange/'.$item->id
        );

        return response()->json([
            'message' => 'Handover dikonfirmasi',
            'data' => $item->fresh(['owner', 'category', 'claimer'])->toApiArray(),
        ]);
    }
}
