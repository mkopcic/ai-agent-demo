<?php

namespace App\Models;

use Database\Factories\ResearchItemFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Schema;

class ResearchItem extends Model
{
    /** @use HasFactory<ResearchItemFactory> */
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'original_url',
        'file_path',
        'provider_file_id',
        'ai_summary',
        'user_notes',
        'web_research',
        'metadata',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<Conversation, $this>
     */
    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    public function isImage(): bool
    {
        return $this->type === 'image';
    }

    public function isDocument(): bool
    {
        return $this->type === 'document';
    }

    public function isUrl(): bool
    {
        return $this->type === 'url';
    }

    public function isProcessed(): bool
    {
        return $this->ai_summary !== null;
    }

    public function getCategory(): ?string
    {
        return $this->metadata['category'] ?? null;
    }

    /**
     * @param  Builder<self>  $query
     */
    public function scopeCategory(Builder $query, ?string $category): void
    {
        if (! $category) {
            return;
        }

        $query->where('metadata->category', $category);
    }

    /**
     * @param  Builder<self>  $query
     */
    public function scopeSearch(Builder $query, ?string $search): void
    {
        if (! $search) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if (in_array($driver, ['pgsql', 'mysql', 'mariadb'])) {
            $query->where(function (Builder $q) use ($search) {
                $q->whereFullText(['title', 'ai_summary', 'user_notes'], $search)
                    ->orWhere('metadata->category', 'like', "%{$search}%");
            });
        } else {
            $query->where(function (Builder $q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('ai_summary', 'like', "%{$search}%")
                    ->orWhere('user_notes', 'like', "%{$search}%")
                    ->orWhere('metadata->category', 'like', "%{$search}%");
            });
        }
    }
}
