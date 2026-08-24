<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommunityEventRegistration extends Model
{
    protected $fillable = ['event_id', 'user_id', 'status'];

    public function event(): BelongsTo
    {
        return $this->belongsTo(CommunityEvent::class, 'event_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
