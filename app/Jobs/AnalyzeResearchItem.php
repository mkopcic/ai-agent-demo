<?php

namespace App\Jobs;

use App\Agents\AnalysisAgent;
use App\Enums\ResearchCategory;
use App\Events\ResearchItemAnalyzed;
use App\Models\ResearchItem;
use Illuminate\Bus\Batchable;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Laravel\Ai\Files;
use Laravel\Ai\Files\Document;
use Laravel\Ai\Files\Image;
use Laravel\Ai\Stores;

use function Laravel\Ai\agent;

class AnalyzeResearchItem implements ShouldQueue
{
    use Batchable, Queueable;

    public int $tries = 5;

    public int $backoff = 90;

    public function __construct(
        public ResearchItem $item,
    ) {}

    public function handle(): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        $user = $this->item->user;

        Log::info('AnalyzeResearchItem started', [
            'item_id' => $this->item->id,
            'type' => $this->item->type,
            'user_id' => $user->id,
            'attempt' => $this->attempts(),
        ]);

        try {
            $this->ensureUserHasVectorStore($user);

            match ($this->item->type) {
                'image' => $this->analyzeImage(),
                'document' => $this->analyzeDocument(),
                'url' => $this->analyzeUrl(),
            };

            $this->item->refresh();
            ResearchItemAnalyzed::dispatch($this->item);

            Log::info('AnalyzeResearchItem completed', ['item_id' => $this->item->id]);
        } catch (\Throwable $e) {
            Log::error('AnalyzeResearchItem failed', [
                'item_id' => $this->item->id,
                'attempt' => $this->attempts(),
                'error' => $e->getMessage(),
                'class' => get_class($e),
            ]);
            throw $e;
        }
    }

    protected function ensureUserHasVectorStore($user): void
    {
        if ($user->hasVectorStore()) {
            Log::info('Vector store exists', ['user_id' => $user->id, 'store_id' => $user->vector_store_id]);
            return;
        }

        Log::info('Creating vector store for user', ['user_id' => $user->id]);

        Cache::lock("vector-store-user-{$user->id}", 30)->block(15, function () use ($user) {
            $user->refresh();

            if ($user->hasVectorStore()) {
                return;
            }

            $store = Stores::create(
                name: "user-{$user->id}-research",
                description: "Personal research knowledge base for user {$user->id}",
                provider: 'openai'
            );

            $user->update(['vector_store_id' => $store->id]);
            Log::info('Vector store created', ['user_id' => $user->id, 'store_id' => $store->id]);
        });
    }

    protected function analyzeImage(): void
    {
        $agent = AnalysisAgent::forImage();

        $response = $agent->prompt(
            'Analyze this image and provide a detailed description.',
            attachments: [
                Image::fromStorage($this->item->file_path),
            ]
        );

        $summary = $response->text;
        $category = $this->categorize($summary);

        $this->item->update([
            'ai_summary' => $summary,
            'title' => $this->generateTitle($summary),
            'metadata' => array_merge($this->item->metadata ?? [], ['category' => $category]),
        ]);

        $this->addToVectorStore($summary);
    }

    protected function analyzeDocument(): void
    {
        Log::info('Uploading document to OpenAI', ['item_id' => $this->item->id, 'path' => $this->item->file_path]);
        $file = Files::putFromStorage($this->item->file_path, provider: 'openai');
        Log::info('Document uploaded', ['item_id' => $this->item->id, 'file_id' => $file->id]);

        $store = Stores::get($this->item->user->vector_store_id, provider: 'openai');
        $store->add($file);
        Log::info('Document added to vector store', ['item_id' => $this->item->id]);

        Log::info('Analyzing document with AI', ['item_id' => $this->item->id]);
        $agent = AnalysisAgent::forDocument();
        $response = $agent->prompt(
            'Analyze and summarize this document.',
            attachments: [
                Document::fromStorage($this->item->file_path),
            ]
        );

        $summary = $response->text;
        $category = $this->categorize($summary);

        $this->item->update([
            'provider_file_id' => $file->id,
            'ai_summary' => $summary,
            'title' => $this->generateTitle($summary),
            'metadata' => array_merge($this->item->metadata ?? [], ['category' => $category]),
        ]);
        Log::info('Document analysis complete', ['item_id' => $this->item->id]);
    }

    protected function analyzeUrl(): void
    {
        $url = $this->item->original_url;

        try {
            $httpResponse = Http::timeout(30)->get($url);
            $body = $httpResponse->body();

            if ($this->isFetchBlocked($httpResponse->status(), $body)) {
                $this->markFetchFailed('The website blocked automated access (bot protection detected).');

                return;
            }

            $content = $this->extractTextFromHtml($body);
        } catch (\Exception $e) {
            $this->markFetchFailed('Could not connect to the website: '.$e->getMessage());

            return;
        }

        if (strlen($content) < 200) {
            $this->markFetchFailed('The page returned no usable text content (it may require JavaScript to render).');

            return;
        }

        $agent = AnalysisAgent::forUrl();

        $response = $agent->prompt(
            "Summarize this webpage content from {$url}:\n\n{$content}"
        );

        $summary = $response->text;
        $category = $this->categorize($summary);

        $this->item->update([
            'ai_summary' => $summary,
            'title' => $this->generateTitle($summary),
            'metadata' => array_merge($this->item->metadata ?? [], ['category' => $category]),
        ]);

        $this->addToVectorStore("URL: {$url}\n\n{$summary}\n\nOriginal content:\n{$content}");
    }

    protected function isFetchBlocked(int $status, string $body): bool
    {
        if ($status === 403 || $status === 429 || $status === 503) {
            return true;
        }

        $stripped = strip_tags($body);
        $isShortBody = strlen($stripped) < 500;

        $blockedPatterns = [
            'access denied',
            'captcha',
            'challenge-platform',
            'cf-browser-verification',
            'enable javascript and cookies',
            'checking your browser',
            'just a moment',
            'akamai',
            'incapsula',
            'attention required',
        ];

        $lowerBody = strtolower($body);

        foreach ($blockedPatterns as $pattern) {
            if (str_contains($lowerBody, $pattern) && $isShortBody) {
                return true;
            }
        }

        return false;
    }

    protected function markFetchFailed(string $error): void
    {
        $this->item->update([
            'metadata' => array_merge($this->item->metadata ?? [], [
                'fetch_failed' => true,
                'fetch_error' => $error,
            ]),
        ]);
    }

    protected function categorize(string $content): string
    {
        $response = agent(
            instructions: 'You are a content categorizer. Categorize the following content into the single most appropriate category.',
            schema: fn (JsonSchema $schema) => [
                'category' => $schema->string()->enum(ResearchCategory::class)->required(),
            ],
        )->prompt($content);

        return ResearchCategory::tryFrom($response['category'])?->value
            ?? ResearchCategory::Other->value;
    }

    protected function addToVectorStore(string $content): void
    {
        $user = $this->item->user;

        // Include user notes as additional context for search
        if ($this->item->user_notes) {
            $content .= "\n\nUser notes: {$this->item->user_notes}";
        }

        $file = Files::put(
            $content,
            mime: 'text/plain',
            name: "research-{$this->item->id}.txt",
            provider: 'openai'
        );

        $store = Stores::get($user->vector_store_id, provider: 'openai');
        $store->add($file, metadata: [
            'research_item_id' => $this->item->id,
            'type' => $this->item->type,
        ]);

        $this->item->update(['provider_file_id' => $file->id]);
    }

    protected function generateTitle(string $summary): string
    {
        $response = agent(
            instructions: 'Generate a short, descriptive title (max 60 characters) for the following content. The title should capture the core subject clearly and concisely. Do not use quotes around the title.',
            schema: fn (JsonSchema $schema) => [
                'title' => $schema->string()->required(),
            ],
        )->prompt($summary);

        return substr($response['title'], 0, 100);
    }

    protected function extractTextFromHtml(string $html): string
    {
        if (! mb_check_encoding($html, 'UTF-8')) {
            $html = mb_convert_encoding($html, 'UTF-8', 'UTF-8');
        }

        $html = preg_replace('/<script\b[^>]*>(.*?)<\/script>/is', '', $html);
        $html = preg_replace('/<style\b[^>]*>(.*?)<\/style>/is', '', $html);
        $html = preg_replace('/<[^>]+>/', ' ', $html);
        $html = html_entity_decode($html, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $html = preg_replace('/\s+/', ' ', $html);

        return trim(mb_substr($html, 0, 15000, 'UTF-8'));
    }
}
