<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ImpactLog extends Model
{
    protected $fillable = [
        'university_id',
        'user_id',
        'type',
        'reference_type',
        'reference_id',
        'quantity',
        'items_saved',
        'estimated_weight',
        'food_rescued_kg',
        'waste_reduced_kg',
        'estimated_saving',
        'money_saved',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'items_saved' => 'integer',
            'estimated_weight' => 'float',
            'food_rescued_kg' => 'float',
            'waste_reduced_kg' => 'float',
            'estimated_saving' => 'integer',
            'money_saved' => 'integer',
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

    public function reference(): MorphTo
    {
        return $this->morphTo();
    }
}
