<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Food extends Model
{
    protected $table = 'foods';

    protected $fillable = [
        'university_id',
        'user_id',
        'title',
        'description',
        'quantity',
        'remaining',
        'price',
        'unit',
        'max_claim_per_user',
        'location',
        'pickup_until',
        'organization',
        'status',
        'image',
    ];

    protected function casts(): array
    {
        return [
            'pickup_until' => 'datetime',
            'quantity' => 'integer',
            'remaining' => 'integer',
            'price' => 'integer',
            'max_claim_per_user' => 'integer',
        ];
    }

    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function claims(): HasMany
    {
        return $this->hasMany(FoodClaim::class);
    }

    public function imageUrl(): ?string
    {
        if (! $this->image) {
            return null;
        }

        if (str_starts_with($this->image, 'http')) {
            return $this->image;
        }

        return Storage::disk('public')->url($this->image);
    }

    /**
     * Demo/lomba: makanan yang masih sisa tapi window pickup sudah lewat
     * dibuka lagi supaya halaman Food Rescue tidak kosong setelah refresh.
     */
    public static function refreshOpenPickupWindows(?int $universityId = null): void
    {
        $query = static::query()
            ->where('remaining', '>', 0)
            ->where(function ($q) {
                $q->where('status', 'expired')
                    ->orWhere(function ($q2) {
                        $q2->where('status', 'available')
                            ->where(function ($q3) {
                                $q3->whereNull('pickup_until')
                                    ->orWhere('pickup_until', '<', now());
                            });
                    });
            })
            ->orderBy('id');

        if ($universityId) {
            $query->where('university_id', $universityId);
        }

        $i = 0;
        foreach ($query->get() as $food) {
            $food->update([
                'status' => 'available',
                'pickup_until' => now()->addHours(2 + ($i % 4) * 1.25),
            ]);
            $i++;
        }
    }

    public static function expireEmptyPastFoods(?int $universityId = null): void
    {
        $query = static::query()
            ->where('status', 'available')
            ->where('pickup_until', '<', now())
            ->where('remaining', '<=', 0);

        if ($universityId) {
            $query->where('university_id', $universityId);
        }

        $query->update(['status' => 'expired']);
    }

    public function toApiArray(?int $userId = null): array
    {
        $this->loadMissing('user');

        if ($this->relationLoaded('claims')) {
            $claimedBy = $this->claims
                ->where('status', '!=', 'cancelled')
                ->groupBy('user_id')
                ->map(fn ($rows) => (int) $rows->sum('quantity'))
                ->all();
        } else {
            $claimedBy = $this->claims()
                ->where('status', '!=', 'cancelled')
                ->selectRaw('user_id, SUM(quantity) as total')
                ->groupBy('user_id')
                ->pluck('total', 'user_id')
                ->map(fn ($v) => (int) $v)
                ->all();
        }

        return [
            'id' => 'f'.$this->id,
            'dbId' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'quantity' => $this->quantity,
            'remaining' => $this->remaining,
            'unit' => $this->unit,
            'maxClaimPerUser' => $this->max_claim_per_user,
            'claimedBy' => collect($claimedBy)->mapWithKeys(fn ($v, $k) => [(string) $k => $v])->all(),
            'location' => $this->location,
            'pickupUntil' => optional($this->pickup_until)?->toISOString(),
            'organization' => $this->organization,
            'status' => $this->status,
            'image' => $this->imageUrl(),
            'owner' => $this->user?->name,
            'ownerId' => $this->user_id ? (string) $this->user_id : null,
            'myClaims' => $userId ? (int) ($claimedBy[$userId] ?? 0) : 0,
            'createdAt' => optional($this->created_at)?->toISOString(),
        ];
    }
}
