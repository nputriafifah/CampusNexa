<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FoodClaim extends Model
{
    protected $fillable = ['food_id', 'user_id', 'quantity', 'status'];

    protected function casts(): array
    {
        return ['quantity' => 'integer'];
    }

    public function food(): BelongsTo
    {
        return $this->belongsTo(Food::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
