<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommunityVolunteerSignup extends Model
{
    protected $fillable = ['volunteer_id', 'user_id', 'status'];

    public function volunteer(): BelongsTo
    {
        return $this->belongsTo(CommunityVolunteer::class, 'volunteer_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
