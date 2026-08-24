<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformSetting extends Model
{
    protected $fillable = ['key', 'value'];

    protected function casts(): array
    {
        return [
            'value' => 'array',
        ];
    }

    public static function getJson(string $key, array $default = []): array
    {
        $row = static::query()->where('key', $key)->first();

        return is_array($row?->value) ? $row->value : $default;
    }

    public static function putJson(string $key, array $value): self
    {
        return static::query()->updateOrCreate(['key' => $key], ['value' => $value]);
    }
}
