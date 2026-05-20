<?php

namespace Database\Seeders;

use App\Models\ResearchItem;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $user = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        ResearchItem::factory(15)->for($user)->url()->create();
        ResearchItem::factory(10)->for($user)->image()->create();
        ResearchItem::factory(5)->for($user)->document()->create();

        // A couple with fetch failures
        ResearchItem::factory(2)->for($user)->url()->create([
            'ai_summary' => null,
            'metadata' => [
                'fetch_failed' => true,
                'fetch_error' => 'The website blocked automated access (bot protection detected).',
            ],
        ]);
    }
}
