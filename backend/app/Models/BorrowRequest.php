<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BorrowRequest extends Model
{
    protected $fillable = [
        'item_id',
        'borrower_id',
        'owner_id',
        'start_date',
        'end_date',
        'message',
        'status',
        'reminder_sent',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'reminder_sent' => 'boolean',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function borrower(): BelongsTo
    {
        return $this->belongsTo(User::class, 'borrower_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function toApiArray(): array
    {
        $this->loadMissing(['item', 'borrower', 'owner']);

        return [
            'id' => 'b'.$this->id,
            'itemId' => 'i'.$this->item_id,
            'itemTitle' => $this->item?->title,
            'borrower' => $this->borrower?->name,
            'borrowerId' => (string) $this->borrower_id,
            'owner' => $this->owner?->name,
            'ownerId' => (string) $this->owner_id,
            'status' => $this->status,
            'requestedAt' => optional($this->created_at)?->toDateString(),
            'dueDate' => optional($this->end_date)?->toDateString(),
            'startDate' => optional($this->start_date)?->toDateString(),
            'endDate' => optional($this->end_date)?->toDateString(),
            'message' => $this->message,
            'reminderSent' => $this->reminder_sent,
        ];
    }
}
