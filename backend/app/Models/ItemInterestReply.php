<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItemInterestReply extends Model
{
    protected $fillable = ['item_interest_id', 'user_id', 'message'];

    public function interest(): BelongsTo
    {
        return $this->belongsTo(ItemInterest::class, 'item_interest_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function toApiArray(): array
    {
        $this->loadMissing('user');

        return [
            'id' => 'ir'.$this->id,
            'interestId' => 'int'.$this->item_interest_id,
            'fromUserId' => (string) $this->user_id,
            'fromName' => $this->user?->name,
            'message' => $this->message,
            'createdAt' => optional($this->created_at)?->toISOString(),
        ];
    }
}
