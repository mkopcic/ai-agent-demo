<?php

namespace Database\Factories;

use App\Enums\ResearchCategory;
use App\Models\ResearchItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ResearchItem>
 */
class ResearchItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'type' => fake()->randomElement(['image', 'document', 'url']),
            'title' => fake()->sentence(4),
            'ai_summary' => fake()->paragraph(),
            'metadata' => [
                'category' => fake()->randomElement(ResearchCategory::cases())->value,
            ],
        ];
    }

    public function image(): static
    {
        return $this->state(fn () => [
            'type' => 'image',
            'file_path' => 'research/'.fake()->uuid().'.jpg',
            'metadata' => [
                'category' => fake()->randomElement(ResearchCategory::cases())->value,
                'mime_type' => 'image/jpeg',
            ],
        ]);
    }

    public function document(): static
    {
        return $this->state(fn () => [
            'type' => 'document',
            'file_path' => 'research/'.fake()->uuid().'.pdf',
            'metadata' => [
                'category' => fake()->randomElement(ResearchCategory::cases())->value,
                'mime_type' => 'application/pdf',
            ],
        ]);
    }

    public function url(): static
    {
        return $this->state(fn () => [
            'type' => 'url',
            'original_url' => fake()->url(),
            'metadata' => [
                'category' => fake()->randomElement(ResearchCategory::cases())->value,
            ],
        ]);
    }

    public function pending(): static
    {
        return $this->state(fn () => [
            'ai_summary' => null,
            'provider_file_id' => null,
        ]);
    }

    public function withCategory(string $category): static
    {
        return $this->state(fn (array $attributes) => [
            'metadata' => array_merge($attributes['metadata'] ?? [], ['category' => $category]),
        ]);
    }
}
