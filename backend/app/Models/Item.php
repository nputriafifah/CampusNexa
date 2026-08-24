<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Item extends Model
{
    protected $fillable = [
        'user_id',
        'organization_id',
        'claimer_id',
        'category_id',
        'title',
        'description',
        'condition',
        'listing_type',
        'price',
        'looking_for',
        'location',
        'status',
        'image',
        'tags',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'price' => 'integer',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function claimer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'claimer_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ItemImage::class);
    }

    public function interests(): HasMany
    {
        return $this->hasMany(ItemInterest::class)->latest();
    }

    public function borrowRequests(): HasMany
    {
        return $this->hasMany(BorrowRequest::class);
    }

    public function favorites(): HasMany
    {
        return $this->hasMany(ItemFavorite::class);
    }

    public function aiAnalyses(): HasMany
    {
        return $this->hasMany(AiAnalysis::class);
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

    public function toApiArray(?int $viewerId = null): array
    {
        $this->loadMissing(['owner.university', 'category', 'claimer']);

        $interestCount = array_key_exists('interests_count', $this->getAttributes())
            ? (int) $this->interests_count
            : (int) $this->interests()->count();

        $favoriteCount = array_key_exists('favorites_count', $this->getAttributes())
            ? (int) $this->favorites_count
            : (int) $this->favorites()->count();

        $borrowCompleted = (int) $this->borrowRequests()->where('status', 'returned')->count();
        $borrowTotal = (int) $this->borrowRequests()->whereIn('status', ['approved', 'returned', 'pending'])->count();

        $myInterest = false;
        if ($viewerId) {
            if (array_key_exists('my_interest', $this->getAttributes())) {
                $myInterest = (bool) $this->my_interest;
            } else {
                $myInterest = $this->interests()->where('user_id', $viewerId)->exists();
            }
        }

        $owner = $this->owner;
        $ownerCompleted = (int) ($owner?->items_saved ?? 0);
        if ($owner) {
            $ownerCompleted += (int) BorrowRequest::query()
                ->where('owner_id', $owner->id)
                ->where('status', 'returned')
                ->count();
        }

        return [
            'id' => 'i'.$this->id,
            'dbId' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'category' => $this->category?->name,
            'condition' => $this->condition,
            'listingType' => $this->listing_type,
            'price' => $this->price,
            'lookingFor' => $this->looking_for,
            'location' => $this->location,
            'owner' => $owner?->name,
            'ownerId' => (string) $this->user_id,
            'ownerFaculty' => $owner?->faculty,
            'ownerStudyProgram' => $owner?->study_program,
            'ownerUniversity' => $owner?->university?->name,
            'ownerCompletedDeals' => max($ownerCompleted, (int) ($owner?->items_saved ?? 0)),
            'image' => $this->imageUrl(),
            'status' => $this->status,
            'createdAt' => optional($this->created_at)?->toDateString(),
            'updatedAt' => optional($this->updated_at)?->toISOString(),
            'tags' => $this->tags ?? [],
            'interestCount' => $interestCount,
            'favoriteCount' => $favoriteCount,
            'borrowCount' => $borrowTotal,
            'borrowCompletedCount' => $borrowCompleted,
            'myInterest' => $myInterest,
            'donationClaim' => $this->claimer_id ? [
                'claimerId' => (string) $this->claimer_id,
                'claimerName' => $this->claimer?->name,
                'claimedAt' => optional($this->updated_at)?->toISOString(),
                'status' => $this->status === 'donated' ? 'completed' : 'reserved',
            ] : null,
        ];
    }
}
