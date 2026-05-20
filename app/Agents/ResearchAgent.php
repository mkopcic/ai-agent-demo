<?php

namespace App\Agents;

use App\Models\User;
use Laravel\Ai\Attributes\Provider;
use Laravel\Ai\Attributes\Temperature;
use Laravel\Ai\Concerns\RemembersConversations;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Contracts\HasTools;
use Laravel\Ai\Promptable;
use Laravel\Ai\Providers\Tools\FileSearch;
use Laravel\Ai\Providers\Tools\WebSearch;
use Stringable;

#[Provider('openai')]
#[Temperature(0.7)]
class ResearchAgent implements Agent, Conversational, HasTools
{
    use Promptable;
    use RemembersConversations;

    public function __construct(
        protected User $user,
    ) {}

    public function instructions(): Stringable|string
    {
        return <<<'PROMPT'
            You are a research assistant with access to the user's personal knowledge base.

            When answering questions:
            1. ALWAYS search the knowledge base first for relevant saved items
            2. If more context is needed, search the web
            3. Cite your sources (which saved items or URLs you referenced)
            4. Be concise but comprehensive
            5. If you find relevant information in the knowledge base, mention the source document

            Your goal is to help the user leverage their saved research and find connections
            between their saved content and new information from the web.
            PROMPT;
    }

    /**
     * @return iterable<FileSearch|WebSearch>
     */
    public function tools(): iterable
    {
        $tools = [];

        if ($this->user->hasVectorStore()) {
            $tools[] = new FileSearch(stores: [$this->user->vector_store_id]);
        }

        $tools[] = new WebSearch;

        return $tools;
    }
}
