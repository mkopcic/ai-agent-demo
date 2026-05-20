<?php

namespace App\Agents;

use Laravel\Ai\Attributes\Provider;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Promptable;
use Stringable;

#[Provider('openai')]
class AnalysisAgent implements Agent
{
    use Promptable;

    public function __construct(
        protected string $systemPrompt = 'You are a helpful assistant.',
    ) {}

    public function instructions(): Stringable|string
    {
        return $this->systemPrompt;
    }

    public static function forImage(): self
    {
        return new self(
            'You are an image analysis assistant. Describe the image in detail, including any text visible. Create a comprehensive summary suitable for search and retrieval.'
        );
    }

    public static function forUrl(): self
    {
        return new self(
            'You are a content summarization assistant. Create a concise but comprehensive summary of the webpage content.'
        );
    }

    public static function forDocument(): self
    {
        return new self(
            'You are a document analysis assistant. Summarize the document content, highlighting key topics, arguments, and conclusions. Create a comprehensive summary suitable for search and retrieval.'
        );
    }
}
