<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CommunityVolunteer extends Model
{
    protected $fillable = [
        'university_id',
        'created_by',
        'event_id',
        'title',
        'description',
        'location',
        'organizer',
        'whatsapp_url',
        'contact_note',
        'starts_at',
        'quota',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'quota' => 'integer',
        ];
    }

    public function signups(): HasMany
    {
        return $this->hasMany(CommunityVolunteerSignup::class, 'volunteer_id');
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(CommunityEvent::class, 'event_id');
    }

    public function toApiArray(?int $userId = null): array
    {
        $active = $this->signups()->whereIn('status', ['pending', 'approved'])->count();
        $mine = $userId
            ? $this->signups()->where('user_id', $userId)->value('status')
            : null;

        return [
            'id' => 'v'.$this->id,
            'dbId' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'location' => $this->location,
            'organizer' => $this->organizer,
            'whatsappUrl' => $this->whatsapp_url,
            'contactNote' => $this->contact_note,
            'startsAt' => optional($this->starts_at)?->toISOString(),
            'quota' => $this->quota,
            'signedUp' => $active,
            'spotsLeft' => max(0, $this->quota - $active),
            'status' => $this->status,
            'myStatus' => $mine,
            'eventId' => $this->event_id ? 'e'.$this->event_id : null,
        ];
    }
}
