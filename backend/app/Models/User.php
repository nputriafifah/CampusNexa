<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'name',
    'email',
    'password',
    'university_id',
    'organization_id',
    'student_id',
    'faculty',
    'whatsapp',
    'study_program',
    'avatar',
    'role',
    'account_status',
    'items_saved',
    'food_rescued_kg',
    'waste_reduced_kg',
    'money_saved',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'food_rescued_kg' => 'float',
            'waste_reduced_kg' => 'float',
            'items_saved' => 'integer',
            'money_saved' => 'integer',
        ];
    }

    public function university(): BelongsTo
    {
        return $this->belongsTo(University::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }

    public function foods(): HasMany
    {
        return $this->hasMany(Food::class);
    }

    public function appNotifications(): HasMany
    {
        return $this->hasMany(AppNotification::class);
    }

    public function toApiArray(): array
    {
        $this->loadMissing(['university', 'organization']);

        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'university' => $this->university?->name,
            'universityId' => $this->university_id ? (string) $this->university_id : null,
            'universityCode' => $this->university?->code,
            'organization' => $this->organization?->name,
            'organizationId' => $this->organization_id ? (string) $this->organization_id : null,
            'faculty' => $this->faculty,
            'studentId' => $this->student_id,
            'whatsapp' => $this->whatsapp,
            'studyProgram' => $this->study_program,
            'avatar' => $this->avatar ?: collect(explode(' ', $this->name))->map(fn ($p) => mb_substr($p, 0, 1))->take(2)->implode(''),
            'role' => $this->role,
            'accountStatus' => $this->account_status ?: 'active',
            'createdAt' => optional($this->created_at)?->toISOString(),
            'impact' => [
                'itemsSaved' => (int) $this->items_saved,
                'foodRescuedKg' => round((float) $this->food_rescued_kg, 1),
                'wasteReducedKg' => round((float) $this->waste_reduced_kg, 1),
                'moneySaved' => (int) $this->money_saved,
            ],
        ];
    }
}
