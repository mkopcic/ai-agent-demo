<?php

use App\Events\ResearchItemAnalyzed;
use App\Jobs\AnalyzeResearchItem;
use App\Models\ResearchItem;
use App\Models\User;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake();
    Queue::fake();
});

it('displays the research index page', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('research.index'))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page->component('research/index'));
});

it('displays saved research items', function () {
    $user = User::factory()->create();
    $items = ResearchItem::factory(3)->for($user)->create();

    $this->actingAs($user)
        ->get(route('research.index'))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('research/index')
            ->has('items.data', 3)
        );
});

it('can upload an image for analysis', function () {
    $user = User::factory()->create();
    $file = UploadedFile::fake()->image('screenshot.png');

    $this->actingAs($user)
        ->post(route('research.store'), [
            'type' => 'image',
            'file' => $file,
        ])
        ->assertRedirect(route('research.index'));

    $this->assertDatabaseHas('research_items', [
        'user_id' => $user->id,
        'type' => 'image',
    ]);

    Queue::assertPushed(AnalyzeResearchItem::class);
});

it('can upload a document for analysis', function () {
    $user = User::factory()->create();
    $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

    $this->actingAs($user)
        ->post(route('research.store'), [
            'type' => 'document',
            'file' => $file,
        ])
        ->assertRedirect(route('research.index'));

    $this->assertDatabaseHas('research_items', [
        'user_id' => $user->id,
        'type' => 'document',
    ]);

    Queue::assertPushed(AnalyzeResearchItem::class);
});

it('can capture a URL for analysis', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('research.store'), [
            'type' => 'url',
            'url' => 'https://example.com/article',
        ])
        ->assertRedirect(route('research.index'));

    $this->assertDatabaseHas('research_items', [
        'user_id' => $user->id,
        'type' => 'url',
        'original_url' => 'https://example.com/article',
    ]);

    Queue::assertPushed(AnalyzeResearchItem::class);
});

it('validates required fields for upload', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('research.store'), [
            'type' => 'image',
        ])
        ->assertSessionHasErrors(['file']);
});

it('validates required fields for URL capture', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('research.store'), [
            'type' => 'url',
        ])
        ->assertSessionHasErrors(['url']);
});

it('can delete a research item', function () {
    $user = User::factory()->create();
    $item = ResearchItem::factory()->for($user)->create();

    $this->actingAs($user)
        ->delete(route('research.destroy', $item))
        ->assertRedirect(route('research.index'));

    $this->assertDatabaseMissing('research_items', [
        'id' => $item->id,
    ]);
});

it('cannot delete another users research item', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $item = ResearchItem::factory()->for($otherUser)->create();

    $this->actingAs($user)
        ->delete(route('research.destroy', $item))
        ->assertForbidden();
});

it('requires authentication to access research pages', function () {
    $this->get(route('research.index'))
        ->assertRedirect(route('login'));
});

// --- Bulk Upload Tests ---

it('can bulk upload multiple files', function () {
    Bus::fake();

    $user = User::factory()->create();
    $files = [
        UploadedFile::fake()->image('photo1.png'),
        UploadedFile::fake()->image('photo2.jpg'),
        UploadedFile::fake()->create('report.pdf', 100, 'application/pdf'),
    ];

    $this->actingAs($user)
        ->post(route('research.bulk-store'), [
            'files' => $files,
        ])
        ->assertRedirect(route('research.index'))
        ->assertSessionHas('success', 'Dodano stavki: 3. Analiza je u tijeku...');

    expect(ResearchItem::where('user_id', $user->id)->count())->toBe(3);
    expect(ResearchItem::where('user_id', $user->id)->where('type', 'image')->count())->toBe(2);
    expect(ResearchItem::where('user_id', $user->id)->where('type', 'document')->count())->toBe(1);

    Bus::assertBatched(fn ($batch) => $batch->jobs->count() === 3
        && $batch->jobs->every(fn ($job) => $job instanceof AnalyzeResearchItem)
    );
});

it('can bulk upload URLs as array', function () {
    Bus::fake();

    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('research.bulk-store'), [
            'urls' => [
                'https://example.com/article-1',
                'https://example.com/article-2',
                'https://example.com/article-3',
            ],
        ])
        ->assertRedirect(route('research.index'))
        ->assertSessionHas('success', 'Dodano stavki: 3. Analiza je u tijeku...');

    expect(ResearchItem::where('user_id', $user->id)->where('type', 'url')->count())->toBe(3);

    Bus::assertBatched(fn ($batch) => $batch->jobs->count() === 3);
});

it('requires at least one file or URL for bulk upload', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('research.bulk-store'), [])
        ->assertSessionHasErrors(['files']);
});

it('applies per-item notes to bulk uploaded files', function () {
    Bus::fake();

    $user = User::factory()->create();
    $files = [
        UploadedFile::fake()->image('photo1.png'),
        UploadedFile::fake()->image('photo2.jpg'),
    ];

    $this->actingAs($user)
        ->post(route('research.bulk-store'), [
            'files' => $files,
            'file_notes' => ['Notes for photo 1', 'Notes for photo 2'],
        ])
        ->assertRedirect(route('research.index'));

    $items = ResearchItem::where('user_id', $user->id)->orderBy('created_at')->get();
    expect($items[0]->user_notes)->toBe('Notes for photo 1');
    expect($items[1]->user_notes)->toBe('Notes for photo 2');
});

it('applies per-item notes to bulk uploaded URLs', function () {
    Bus::fake();

    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('research.bulk-store'), [
            'urls' => [
                'https://example.com/article-1',
                'https://example.com/article-2',
            ],
            'url_notes' => ['URL notes 1', 'URL notes 2'],
        ])
        ->assertRedirect(route('research.index'));

    $items = ResearchItem::where('user_id', $user->id)->orderBy('created_at')->get();
    expect($items[0]->user_notes)->toBe('URL notes 1');
    expect($items[1]->user_notes)->toBe('URL notes 2');
});

it('handles missing per-item notes gracefully', function () {
    Bus::fake();

    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('research.bulk-store'), [
            'urls' => [
                'https://example.com/article-1',
                'https://example.com/article-2',
            ],
        ])
        ->assertRedirect(route('research.index'));

    $items = ResearchItem::where('user_id', $user->id)->get();
    expect($items->every(fn ($item) => $item->user_notes === null))->toBeTrue();
});

// --- Show & Update Tests ---

it('displays the research item show page', function () {
    $user = User::factory()->create();
    $item = ResearchItem::factory()->for($user)->create();

    $this->actingAs($user)
        ->get(route('research.show', $item))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('research/show')
            ->has('item')
        );
});

it('cannot view another users research item', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $item = ResearchItem::factory()->for($otherUser)->create();

    $this->actingAs($user)
        ->get(route('research.show', $item))
        ->assertForbidden();
});

it('can update a research items title and notes', function () {
    $user = User::factory()->create();
    $item = ResearchItem::factory()->for($user)->create();

    $this->actingAs($user)
        ->put(route('research.update', $item), [
            'title' => 'Updated Title',
            'user_notes' => 'Updated notes here',
        ])
        ->assertRedirect(route('research.show', $item))
        ->assertSessionHas('success', 'Stavka je ažurirana.');

    $item->refresh();
    expect($item->title)->toBe('Updated Title');
    expect($item->user_notes)->toBe('Updated notes here');
});

it('cannot update another users research item', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $item = ResearchItem::factory()->for($otherUser)->create();

    $this->actingAs($user)
        ->put(route('research.update', $item), [
            'title' => 'Hacked Title',
        ])
        ->assertForbidden();
});

it('validates title is required when updating', function () {
    $user = User::factory()->create();
    $item = ResearchItem::factory()->for($user)->create();

    $this->actingAs($user)
        ->put(route('research.update', $item), [
            'title' => '',
        ])
        ->assertSessionHasErrors(['title']);
});

// --- Serve File Tests ---

it('can serve an image file', function () {
    $user = User::factory()->create();

    $file = UploadedFile::fake()->image('test.png');
    $path = $file->store('research/'.$user->id);

    $item = ResearchItem::factory()->image()->for($user)->create([
        'file_path' => $path,
        'metadata' => [
            'original_name' => 'test.png',
            'mime_type' => 'image/png',
            'size' => $file->getSize(),
        ],
    ]);

    $this->actingAs($user)
        ->get(route('research.serve-file', $item))
        ->assertSuccessful()
        ->assertHeader('Content-Type', 'image/png');
});

it('cannot serve another users file', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $item = ResearchItem::factory()->image()->for($otherUser)->create();

    $this->actingAs($user)
        ->get(route('research.serve-file', $item))
        ->assertForbidden();
});

// --- Search Tests ---

it('can search research items by title', function () {
    $user = User::factory()->create();
    ResearchItem::factory()->for($user)->create(['title' => 'Machine Learning Notes']);
    ResearchItem::factory()->for($user)->create(['title' => 'Cooking Recipes']);

    $this->actingAs($user)
        ->get(route('research.index', ['search' => 'machine']))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('research/index')
            ->has('items.data', 1)
            ->where('filters.search', 'machine')
        );
});

it('can search research items by ai summary', function () {
    $user = User::factory()->create();
    ResearchItem::factory()->for($user)->create(['ai_summary' => 'Deep neural networks for image classification']);
    ResearchItem::factory()->for($user)->create(['ai_summary' => 'Simple pasta recipe']);

    $this->actingAs($user)
        ->get(route('research.index', ['search' => 'neural']))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->has('items.data', 1)
        );
});

it('can search research items by user notes', function () {
    $user = User::factory()->create();
    ResearchItem::factory()->for($user)->create(['user_notes' => 'Important reference for thesis']);
    ResearchItem::factory()->for($user)->create(['user_notes' => null]);

    $this->actingAs($user)
        ->get(route('research.index', ['search' => 'thesis']))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->has('items.data', 1)
        );
});

it('can search research items by category', function () {
    $user = User::factory()->create();
    ResearchItem::factory()->for($user)->withCategory('technology')->create();
    ResearchItem::factory()->for($user)->withCategory('recipes')->create();

    $this->actingAs($user)
        ->get(route('research.index', ['search' => 'technology']))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->has('items.data', 1)
        );
});

it('returns all items when search is empty', function () {
    $user = User::factory()->create();
    ResearchItem::factory(3)->for($user)->create();

    $this->actingAs($user)
        ->get(route('research.index', ['search' => '']))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->has('items.data', 3)
        );
});

it('returns filters and stats props', function () {
    $user = User::factory()->create();
    ResearchItem::factory()->for($user)->image()->create();
    ResearchItem::factory()->for($user)->url()->create();

    $this->actingAs($user)
        ->get(route('research.index'))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->where('filters.search', '')
            ->where('filters.category', '')
            ->where('stats.total', 2)
            ->where('stats.images', 1)
            ->where('stats.urls', 1)
            ->where('stats.documents', 0)
        );
});

it('stats are not affected by search filter', function () {
    $user = User::factory()->create();
    ResearchItem::factory()->for($user)->create(['title' => 'Machine Learning']);
    ResearchItem::factory()->for($user)->create(['title' => 'Cooking']);

    $this->actingAs($user)
        ->get(route('research.index', ['search' => 'machine']))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->has('items.data', 1)
            ->where('stats.total', 2)
        );
});

// --- Category Filter Tests ---

it('can filter research items by category', function () {
    $user = User::factory()->create();
    ResearchItem::factory()->for($user)->withCategory('technology')->create();
    ResearchItem::factory()->for($user)->withCategory('technology')->create();
    ResearchItem::factory()->for($user)->withCategory('recipes')->create();

    $this->actingAs($user)
        ->get(route('research.index', ['category' => 'technology']))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->has('items.data', 2)
            ->where('filters.category', 'technology')
        );
});

it('returns all items when category filter is empty', function () {
    $user = User::factory()->create();
    ResearchItem::factory()->for($user)->withCategory('technology')->create();
    ResearchItem::factory()->for($user)->withCategory('recipes')->create();

    $this->actingAs($user)
        ->get(route('research.index', ['category' => '']))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->has('items.data', 2)
        );
});

it('can combine search and category filter', function () {
    $user = User::factory()->create();
    ResearchItem::factory()->for($user)->withCategory('technology')->create(['title' => 'AI Research', 'ai_summary' => 'Summary about artificial intelligence.']);
    ResearchItem::factory()->for($user)->withCategory('technology')->create(['title' => 'Web Development', 'ai_summary' => 'Summary about web development.']);
    ResearchItem::factory()->for($user)->withCategory('recipes')->create(['title' => 'AI Cooking', 'ai_summary' => 'Summary about cooking.']);

    $this->actingAs($user)
        ->get(route('research.index', ['search' => 'AI', 'category' => 'technology']))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->has('items.data', 1)
        );
});

it('model getCategory helper returns category from metadata', function () {
    $item = ResearchItem::factory()->withCategory('technology')->create();
    expect($item->getCategory())->toBe('technology');
});

it('model getCategory returns null when no category', function () {
    $item = ResearchItem::factory()->create(['metadata' => []]);
    expect($item->getCategory())->toBeNull();
});

// --- Fetch Failure Detection Tests ---

it('detects blocked responses and sets fetch_failed metadata', function () {
    $user = User::factory()->create(['vector_store_id' => 'vs_test']);
    $item = ResearchItem::factory()->url()->pending()->for($user)->create([
        'original_url' => 'https://blocked-site.example.com/article',
    ]);

    Http::fake([
        'blocked-site.example.com/*' => Http::response('<html><body>Access Denied</body></html>', 403),
    ]);

    Event::fake([ResearchItemAnalyzed::class]);

    (new AnalyzeResearchItem($item))->handle();

    $item->refresh();
    expect($item->metadata['fetch_failed'])->toBeTrue();
    expect($item->metadata['fetch_error'])->toContain('blocked automated access');
    expect($item->ai_summary)->toBeNull();

    Event::assertDispatched(ResearchItemAnalyzed::class);
});

it('detects bot protection in 200 responses with challenge content', function () {
    $user = User::factory()->create(['vector_store_id' => 'vs_test']);
    $item = ResearchItem::factory()->url()->pending()->for($user)->create([
        'original_url' => 'https://protected-site.example.com/page',
    ]);

    Http::fake([
        'protected-site.example.com/*' => Http::response(
            '<html><head><title>Just a moment...</title></head><body>Checking your browser</body></html>',
            200
        ),
    ]);

    Event::fake([ResearchItemAnalyzed::class]);

    (new AnalyzeResearchItem($item))->handle();

    $item->refresh();
    expect($item->metadata['fetch_failed'])->toBeTrue();
    expect($item->ai_summary)->toBeNull();
});

it('marks fetch_failed when extracted content is too short', function () {
    $user = User::factory()->create(['vector_store_id' => 'vs_test']);
    $item = ResearchItem::factory()->url()->pending()->for($user)->create([
        'original_url' => 'https://js-heavy-site.example.com/page',
    ]);

    Http::fake([
        'js-heavy-site.example.com/*' => Http::response('<html><head><script>app.init()</script></head><body><noscript>Enable JS</noscript></body></html>', 200),
    ]);

    Event::fake([ResearchItemAnalyzed::class]);

    (new AnalyzeResearchItem($item))->handle();

    $item->refresh();
    expect($item->metadata['fetch_failed'])->toBeTrue();
    expect($item->metadata['fetch_error'])->toContain('no usable text content');
    expect($item->ai_summary)->toBeNull();
});

it('marks fetch_failed on connection exceptions', function () {
    $user = User::factory()->create(['vector_store_id' => 'vs_test']);
    $item = ResearchItem::factory()->url()->pending()->for($user)->create([
        'original_url' => 'https://unreachable-site.example.com/page',
    ]);

    Http::fake([
        'unreachable-site.example.com/*' => fn () => throw new ConnectionException('Connection timed out'),
    ]);

    Event::fake([ResearchItemAnalyzed::class]);

    (new AnalyzeResearchItem($item))->handle();

    $item->refresh();
    expect($item->metadata['fetch_failed'])->toBeTrue();
    expect($item->metadata['fetch_error'])->toContain('Could not connect');
    expect($item->ai_summary)->toBeNull();
});

// --- Replace With File Tests ---

it('can replace a failed URL item with a file upload', function () {
    $user = User::factory()->create();
    $item = ResearchItem::factory()->url()->for($user)->create([
        'ai_summary' => null,
        'metadata' => [
            'fetch_failed' => true,
            'fetch_error' => 'Bot protection detected',
        ],
    ]);

    $file = UploadedFile::fake()->image('screenshot.png');

    $this->actingAs($user)
        ->post(route('research.replace', $item), ['file' => $file])
        ->assertRedirect(route('research.show', $item))
        ->assertSessionHas('success', 'Datoteka je uploadana! Ponovno analiziram sadržaj...');

    $item->refresh();
    expect($item->type)->toBe('image');
    expect($item->file_path)->not->toBeNull();
    expect($item->ai_summary)->toBeNull();
    expect($item->metadata['fetch_failed'] ?? null)->toBeNull();
    expect($item->metadata['original_name'])->toBe('screenshot.png');

    Queue::assertPushed(AnalyzeResearchItem::class, fn ($job) => $job->item->id === $item->id);
});

it('can replace a failed URL item with a PDF', function () {
    $user = User::factory()->create();
    $item = ResearchItem::factory()->url()->for($user)->create([
        'metadata' => ['fetch_failed' => true, 'fetch_error' => 'Bot protection'],
    ]);

    $file = UploadedFile::fake()->create('article.pdf', 100, 'application/pdf');

    $this->actingAs($user)
        ->post(route('research.replace', $item), ['file' => $file])
        ->assertRedirect(route('research.show', $item));

    $item->refresh();
    expect($item->type)->toBe('document');
});

it('cannot replace another users research item', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $item = ResearchItem::factory()->url()->for($otherUser)->create([
        'metadata' => ['fetch_failed' => true],
    ]);

    $file = UploadedFile::fake()->image('screenshot.png');

    $this->actingAs($user)
        ->post(route('research.replace', $item), ['file' => $file])
        ->assertForbidden();
});

it('validates file is required for replace', function () {
    $user = User::factory()->create();
    $item = ResearchItem::factory()->url()->for($user)->create();

    $this->actingAs($user)
        ->post(route('research.replace', $item), [])
        ->assertSessionHasErrors(['file']);
});

// --- Broadcasting Tests ---

it('broadcasts ResearchItemAnalyzed on the users private channel', function () {
    Event::fake();

    $user = User::factory()->create();
    $item = ResearchItem::factory()->for($user)->create();

    ResearchItemAnalyzed::dispatch($item);

    Event::assertDispatched(ResearchItemAnalyzed::class, function ($event) use ($item) {
        return $event->item->id === $item->id;
    });
});

it('ResearchItemAnalyzed broadcasts with correct payload', function () {
    $user = User::factory()->create();
    $item = ResearchItem::factory()->for($user)->withCategory('technology')->create([
        'title' => 'Test Title',
        'ai_summary' => 'Test Summary',
    ]);

    $event = new ResearchItemAnalyzed($item);

    expect($event->broadcastWith())->toBe([
        'id' => $item->id,
        'title' => 'Test Title',
        'ai_summary' => 'Test Summary',
        'category' => 'technology',
        'fetch_failed' => false,
        'fetch_error' => null,
    ]);
});

it('ResearchItemAnalyzed broadcasts fetch failure info', function () {
    $user = User::factory()->create();
    $item = ResearchItem::factory()->for($user)->url()->create([
        'ai_summary' => null,
        'metadata' => [
            'fetch_failed' => true,
            'fetch_error' => 'Bot protection detected',
        ],
    ]);

    $event = new ResearchItemAnalyzed($item);
    $payload = $event->broadcastWith();

    expect($payload['fetch_failed'])->toBeTrue();
    expect($payload['fetch_error'])->toBe('Bot protection detected');
    expect($payload['ai_summary'])->toBeNull();
});

it('ResearchItemAnalyzed broadcasts on the correct channel', function () {
    $user = User::factory()->create();
    $item = ResearchItem::factory()->for($user)->create();

    $event = new ResearchItemAnalyzed($item);
    $channels = $event->broadcastOn();

    expect($channels)->toHaveCount(1);
    expect($channels[0]->name)->toBe('private-App.Models.User.'.$user->id);
});
