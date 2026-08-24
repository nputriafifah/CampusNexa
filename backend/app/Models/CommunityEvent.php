<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CommunityEvent extends Model
{
    protected $fillable = [
        'university_id',
        'created_by',
        'title',
        'description',
        'location',
        'organizer',
        'whatsapp_url',
        'contact_note',
        'starts_at',
        'ends_at',
        'quota',
        'status',
        'kind',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'quota' => 'integer',
        ];
    }

    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(CommunityEventRegistration::class, 'event_id');
    }

    public function toApiArray(?int $userId = null): array
    {
        $registered = $this->registrations()->where('status', 'registered')->count();
        $mine = $userId
            ? $this->registrations()->where('user_id', $userId)->value('status')
            : null;

        return [
            'id' => 'e'.$this->id,
            'dbId' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'location' => $this->location,
            'organizer' => $this->organizer,
            'whatsappUrl' => $this->whatsapp_url,
            'contactNote' => $this->contact_note,
            'startsAt' => optional($this->starts_at)?->toISOString(),
            'endsAt' => optional($this->ends_at)?->toISOString(),
            'quota' => $this->quota,
            'registered' => $registered,
            'spotsLeft' => max(0, $this->quota - $registered),
            'status' => $this->status,
            'myStatus' => $mine,
        ];
    }
}
