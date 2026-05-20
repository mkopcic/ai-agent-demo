<?php

namespace App\Http\Controllers;

use App\Agents\ResearchAgent;
use App\Http\Requests\SendMessageRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\StreamedEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Ai\Responses\StreamableAgentResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

use function Laravel\Ai\agent;

class ConversationController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $conversationId = $request->get('conversation');

        $conversations = DB::table('agent_conversations')
            ->where('user_id', $user->id)
            ->orderByDesc('updated_at')
            ->limit(20)
            ->get(['id', 'title', 'created_at', 'updated_at']);

        $currentConversation = null;
        $messages = [];

        if ($conversationId) {
            $currentConversation = DB::table('agent_conversations')
                ->where('id', $conversationId)
                ->where('user_id', $user->id)
                ->first(['id', 'title', 'created_at']);

            if ($currentConversation) {
                $messages = DB::table('agent_conversation_messages')
                    ->where('conversation_id', $currentConversation->id)
                    ->orderBy('created_at')
                    ->get(['id', 'role', 'content', 'tool_calls', 'created_at']);
            }
        }

        $fileMap = $user->researchItems()
            ->whereNotNull('provider_file_id')
            ->pluck('id', 'provider_file_id')
            ->toArray();

        return Inertia::render('research/chat', [
            'conversations' => $conversations,
            'currentConversation' => $currentConversation,
            'messages' => $messages,
            'fileMap' => $fileMap,
        ]);
    }

    public function stream(SendMessageRequest $request): StreamableAgentResponse
    {
        set_time_limit(0);

        $user = $request->user();
        $message = $request->validated('message');
        $conversationId = $request->validated('conversation_id');

        $agent = new ResearchAgent($user);

        if ($conversationId) {
            $this->authorizeConversation($conversationId, $user->id);
            $agent->continue($conversationId, as: $user);
        } else {
            $agent->forUser($user);
        }

        return $agent->stream($message);
    }

    public function destroy(Request $request, string $conversation): RedirectResponse
    {
        $deleted = DB::table('agent_conversations')
            ->where('id', $conversation)
            ->where('user_id', $request->user()->id)
            ->delete();

        if (! $deleted) {
            abort(403);
        }

        DB::table('agent_conversation_messages')
            ->where('conversation_id', $conversation)
            ->delete();

        return redirect()->route('research.chat')
            ->with('success', __('Conversation deleted.'));
    }

    public function titleStream(Request $request, string $conversation): StreamedResponse
    {
        $userId = $request->user()->id;

        $conv = DB::table('agent_conversations')
            ->where('id', $conversation)
            ->where('user_id', $userId)
            ->first(['id', 'title']);

        if (! $conv) {
            abort(403);
        }

        return response()->eventStream(function () use ($conv, $conversation) {
            $title = $this->resolveTitle($conv, $conversation);

            yield new StreamedEvent(
                event: 'title-update',
                data: json_encode(['title' => $title])
            );
        }, endStreamWith: new StreamedEvent(event: 'title-update', data: '</stream>'));
    }

    /**
     * Resolve the title for a conversation, generating one if needed.
     */
    protected function resolveTitle(object $conv, string $conversationId): string
    {
        if ($conv->title && $conv->title !== 'Untitled') {
            return $conv->title;
        }

        return $this->generateTitle($conversationId);
    }

    /**
     * Generate a title for a conversation using AI.
     */
    protected function generateTitle(string $conversationId): string
    {
        $firstMessage = DB::table('agent_conversation_messages')
            ->where('conversation_id', $conversationId)
            ->where('role', 'user')
            ->orderBy('created_at')
            ->value('content');

        if (! $firstMessage) {
            return __('New Conversation');
        }

        $title = $this->createTitleFromMessage($firstMessage);

        DB::table('agent_conversations')
            ->where('id', $conversationId)
            ->update(['title' => $title]);

        Log::info('Generated title for conversation', [
            'conversation_id' => $conversationId,
            'title' => $title,
        ]);

        return $title;
    }

    /**
     * Create a title from a message, using AI or fallback.
     */
    protected function createTitleFromMessage(string $message): string
    {
        if (app()->environment('testing') || ! config('ai.providers.openai.api_key')) {
            return $this->truncateTitle(__('Chat').': '.substr($message, 0, 30));
        }

        try {
            $response = agent(
                instructions: 'Generiraj kratak, opisni naslov na hrvatskom jeziku (najviše 50 znakova) za chat. Odgovori samo naslovom, bez navodnika i dodatnog formatiranja.'
            )->prompt($message);

            return $this->truncateTitle(trim((string) $response));
        } catch (\Exception $e) {
            Log::error('Error generating title, using fallback', ['error' => $e->getMessage()]);

            return $this->truncateTitle($message);
        }
    }

    protected function truncateTitle(string $title): string
    {
        if (strlen($title) <= 50) {
            return $title;
        }

        return substr($title, 0, 47).'...';
    }

    protected function authorizeConversation(string $conversationId, int $userId): void
    {
        $exists = DB::table('agent_conversations')
            ->where('id', $conversationId)
            ->where('user_id', $userId)
            ->exists();

        if (! $exists) {
            abort(403);
        }
    }
}
