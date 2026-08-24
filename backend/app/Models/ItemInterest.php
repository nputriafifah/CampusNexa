<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ItemInterest extends Model
{
    protected $fillable = ['item_id', 'user_id', 'message'];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function replies(): HasMany
    {
        return $this->hasMany(ItemInterestReply::class)->oldest();
    }

    public function toApiArray(bool $includeContact = false): array
    {
        $this->loadMissing(['user', 'replies.user']);

        $payload = [
            'id' => 'int'.$this->id,
            'dbId' => $this->id,
            'itemId' => 'i'.$this->item_id,
            'fromUserId' => (string) $this->user_id,
            'fromName' => $this->user?->name,
            'message' => $this->message,
            'createdAt' => optional($this->created_at)?->toISOString(),
            'replies' => $this->replies->map->toApiArray()->values(),
        ];

        if ($includeContact) {
            $payload['fromFaculty'] = $this->user?->faculty;
        }

        return $payload;
    }
}
