<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->user = User::factory()->create();
});

it('generates a title for new conversations via title stream', function () {
    // Create a conversation with "Untitled" title
    $conversationId = (string) Str::uuid();
    DB::table('agent_conversations')->insert([
        'id' => $conversationId,
        'user_id' => $this->user->id,
        'title' => 'Untitled',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // Add a user message
    DB::table('agent_conversation_messages')->insert([
        'id' => (string) Str::uuid(),
        'conversation_id' => $conversationId,
        'user_id' => $this->user->id,
        'agent' => 'App\\Agents\\ResearchAgent',
        'role' => 'user',
        'content' => 'What are the best practices for Laravel development?',
        'attachments' => '[]',
        'tool_calls' => '[]',
        'tool_results' => '[]',
        'usage' => '{}',
        'meta' => '{}',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // In testing environment, title generation uses fallback
    $response = $this->actingAs($this->user)
        ->get("/research/chat/{$conversationId}/title-stream");

    $response->assertOk();

    // Stream the response to trigger title generation
    $content = $response->streamedContent();

    // Verify the stream contains the title update event
    expect($content)->toContain('event: title-update');
    expect($content)->toContain('Chat:');

    // Verify title was updated in database (fallback in testing)
    $conversation = DB::table('agent_conversations')
        ->where('id', $conversationId)
        ->first();

    expect($conversation->title)->toStartWith('Chat: ');
});

it('returns existing title without generating new one', function () {
    $conversationId = (string) Str::uuid();
    $existingTitle = 'Laravel Best Practices Discussion';

    DB::table('agent_conversations')->insert([
        'id' => $conversationId,
        'user_id' => $this->user->id,
        'title' => $existingTitle,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $response = $this->actingAs($this->user)
        ->get("/research/chat/{$conversationId}/title-stream");

    $response->assertOk();

    // Title should remain unchanged
    $conversation = DB::table('agent_conversations')
        ->where('id', $conversationId)
        ->first();

    expect($conversation->title)->toBe($existingTitle);
});

it('prevents unauthorized access to title stream', function () {
    $otherUser = User::factory()->create();

    $conversationId = (string) Str::uuid();
    DB::table('agent_conversations')->insert([
        'id' => $conversationId,
        'user_id' => $otherUser->id,
        'title' => 'Untitled',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $response = $this->actingAs($this->user)
        ->get("/research/chat/{$conversationId}/title-stream");

    $response->assertForbidden();
});

it('truncates long titles to 50 characters', function () {
    $conversationId = (string) Str::uuid();
    DB::table('agent_conversations')->insert([
        'id' => $conversationId,
        'user_id' => $this->user->id,
        'title' => 'Untitled',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // Add a very long message
    $longMessage = str_repeat('This is a very long message about Laravel. ', 10);
    DB::table('agent_conversation_messages')->insert([
        'id' => (string) Str::uuid(),
        'conversation_id' => $conversationId,
        'user_id' => $this->user->id,
        'agent' => 'App\\Agents\\ResearchAgent',
        'role' => 'user',
        'content' => $longMessage,
        'attachments' => '[]',
        'tool_calls' => '[]',
        'tool_results' => '[]',
        'usage' => '{}',
        'meta' => '{}',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $response = $this->actingAs($this->user)
        ->get("/research/chat/{$conversationId}/title-stream");

    // Stream the response to trigger title generation
    $response->streamedContent();

    $conversation = DB::table('agent_conversations')
        ->where('id', $conversationId)
        ->first();

    expect(strlen($conversation->title))->toBeLessThanOrEqual(50);
});
