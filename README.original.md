# Larrykonn

Larrykonn is a minimal demo app that showcases what’s possible with the Laravel AI SDK.

Links:

- Laravel Cloud: https://laravel.com/cloud
- Demo repo: https://larrykonn.laravel.cloud
- Laravel AI SDK: https://laravel.com/ai

## Quickstart

1. Copy the environment file:

```shell
cp .env.example .env
```

2. Add at least one AI provider API key in `.env`.
3. Install dependencies, generate an app key, migrate, and run the dev server:

```shell
composer install
npm install
php artisan key:generate
php artisan migrate
npm run dev
```

## Features (with tiny examples)

### Agents (prompt + stream)

```php
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Promptable;

class DemoAgent implements Agent
{
    use Promptable;

    public function instructions(): string
    {
        return 'You are a concise product guide.';
    }
}

$text = (new DemoAgent)->prompt('Summarize the new release.')->text;
return (new DemoAgent)->stream('Write a short launch blurb.');
```

### Structured output

```php
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Promptable;

class Reviewer implements Agent, HasStructuredOutput
{
    use Promptable;

    public function instructions(): string
    {
        return 'Review copy and score it.';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'score' => $schema->integer()->min(1)->max(10)->required(),
            'feedback' => $schema->string()->required(),
        ];
    }
}

$review = (new Reviewer)->prompt('Review this hero headline.');
```

### Images + audio + transcription

```php
use Laravel\Ai\Audio;
use Laravel\Ai\Image;
use Laravel\Ai\Transcription;

$image = Image::of('A studio photo of a latte')->landscape()->generate();
$audio = Audio::of('Welcome to Larrykonn.')->female()->generate();
$text = Transcription::fromStorage('demo.wav')->generate();
```

### Embeddings + reranking

```php
use Laravel\Ai\Embeddings;
use Laravel\Ai\Reranking;

$vectors = Embeddings::for(['Doc A', 'Doc B'])->dimensions(1536)->generate();
$ranked = Reranking::of(['Doc A', 'Doc B'])->rerank('best match');
```

### Files + vector stores

```php
use Laravel\Ai\Files\Document;
use Laravel\Ai\Stores;

$file = Document::fromStorage('guide.pdf')->put();
$store = Stores::create('Knowledge Base');
$store->add($file->id);
```

### Testing fakes

```php
use Laravel\Ai\Embeddings;
use Laravel\Ai\Image;

Image::fake();
Embeddings::fake()->preventStrayEmbeddings();
```
