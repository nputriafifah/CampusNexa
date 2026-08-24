<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppNotification extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'body',
        'type',
        'link',
        'is_read',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
            'read_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function toApiArray(): array
    {
        return [
            'id' => 'n'.$this->id,
            'title' => $this->title,
            'body' => $this->body,
            'type' => $this->type,
            'link' => $this->link,
            'read' => $this->is_read || $this->read_at !== null,
            'time' => self::humanTime($this->created_at),
            'createdAt' => optional($this->created_at)?->toISOString(),
        ];
    }

    public static function humanTime(?\DateTimeInterface $at): string
    {
        if (! $at) {
            return 'Baru saja';
        }

        $seconds = max(0, (int) now()->diffInSeconds($at));
        if ($seconds < 45) {
            return 'Baru saja';
        }

        $minutes = intdiv($seconds, 60);
        if ($minutes < 60) {
            return $minutes.' menit lalu';
        }

        $hours = intdiv($minutes, 60);
        if ($hours < 24) {
            return $hours.' jam lalu';
        }

        $days = intdiv($hours, 24);
        if ($days === 1) {
            return 'Kemarin';
        }
        if ($days < 7) {
            return $days.' hari lalu';
        }

        return $at->format('d/m/Y');
    }
}
