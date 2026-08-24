<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiAnalysis extends Model
{
    protected $fillable = [
        'user_id',
        'item_id',
        'image_url',
        'detected_category',
        'condition',
        'estimated_price',
        'recommendation',
        'generated_description',
        'payload',
        'confidence',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'confidence' => 'integer',
            'estimated_price' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
}
