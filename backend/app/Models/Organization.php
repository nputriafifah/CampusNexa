<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    protected $fillable = [
        'university_id',
        'name',
        'type',
        'logo',
        'description',
    ];

    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }

    public function usageStats(): array
    {
        return [
            'members' => (int) $this->users()->count(),
            'items' => (int) $this->items()->count(),
            'foods' => (int) Food::query()
                ->where('university_id', $this->university_id)
                ->where('organization', $this->name)
                ->count(),
            'events' => (int) CommunityEvent::query()
                ->where('university_id', $this->university_id)
                ->where('organizer', $this->name)
                ->count(),
            'volunteers' => (int) CommunityVolunteer::query()
                ->where('university_id', $this->university_id)
                ->where('organizer', $this->name)
                ->count(),
        ];
    }

    public function syncNameReferences(string $oldName, string $newName): void
    {
        if ($oldName === $newName) {
            return;
        }

        Food::query()
            ->where('university_id', $this->university_id)
            ->where('organization', $oldName)
            ->update(['organization' => $newName]);

        CommunityEvent::query()
            ->where('university_id', $this->university_id)
            ->where('organizer', $oldName)
            ->update(['organizer' => $newName]);

        CommunityVolunteer::query()
            ->where('university_id', $this->university_id)
            ->where('organizer', $oldName)
            ->update(['organizer' => $newName]);
    }

    public function toApiArray(bool $withStats = false): array
    {
        $data = [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type,
            'logo' => $this->logo,
            'description' => $this->description,
            'universityId' => $this->university_id,
        ];

        if ($withStats) {
            $data['stats'] = $this->usageStats();
        }

        return $data;
    }
}
