<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Category extends Model
{
    protected $fillable = ['name', 'slug', 'group', 'is_active'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }

    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'group' => $this->group ?? 'resource',
            'isActive' => (bool) $this->is_active,
            'itemsCount' => (int) ($this->items_count ?? 0),
        ];
    }

    public static function resolveActiveResource(?string $name): ?self
    {
        if ($name === null || trim($name) === '') {
            return null;
        }

        $name = trim($name);

        return self::query()
            ->where('group', 'resource')
            ->where('is_active', true)
            ->where(function ($q) use ($name) {
                $q->where('name', $name)->orWhere('slug', Str::slug($name));
            })
            ->first();
    }
}
