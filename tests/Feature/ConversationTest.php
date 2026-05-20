<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

it('displays the chat page', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('research.chat'))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page->component('research/chat'));
});

it('displays conversation history', function () {
    $user = User::factory()->create();

    // Create conversations using the package's table
    for ($i = 0; $i < 3; $i++) {
        DB::table('agent_conversations')->insert([
            'id' => (string) Str::uuid7(),
            'user_id' => $user->id,
            'title' => "Conversation {$i}",
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    $this->actingAs($user)
        ->get(route('research.chat'))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('research/chat')
            ->has('conversations', 3)
        );
});

it('can load a specific conversation', function () {
    $user = User::factory()->create();

    $conversationId = (string) Str::uuid7();
    DB::table('agent_conversations')->insert([
        'id' => $conversationId,
        'user_id' => $user->id,
        'title' => 'Test Conversation',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // Add messages
    for ($i = 0; $i < 5; $i++) {
        DB::table('agent_conversation_messages')->insert([
            'id' => (string) Str::uuid7(),
            'conversation_id' => $conversationId,
            'user_id' => $user->id,
            'agent' => 'App\\Agents\\ResearchAgent',
            'role' => $i % 2 === 0 ? 'user' : 'assistant',
            'content' => "Message {$i}",
            'attachments' => '[]',
            'tool_calls' => '[]',
            'tool_results' => '[]',
            'usage' => '[]',
            'meta' => '[]',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    $this->actingAs($user)
        ->get(route('research.chat', ['conversation' => $conversationId]))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('research/chat')
            ->has('messages', 5)
            ->where('currentConversation.id', $conversationId)
        );
});

it('can delete a conversation', function () {
    $user = User::factory()->create();

    $conversationId = (string) Str::uuid7();
    DB::table('agent_conversations')->insert([
        'id' => $conversationId,
        'user_id' => $user->id,
        'title' => 'Test Conversation',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->actingAs($user)
        ->delete(route('research.chat.destroy', $conversationId))
        ->assertRedirect(route('research.chat'));

    $this->assertDatabaseMissing('agent_conversations', [
        'id' => $conversationId,
    ]);
});

it('cannot delete another users conversation', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    $conversationId = (string) Str::uuid7();
    DB::table('agent_conversations')->insert([
        'id' => $conversationId,
        'user_id' => $otherUser->id,
        'title' => 'Other User Conversation',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->actingAs($user)
        ->delete(route('research.chat.destroy', $conversationId))
        ->assertForbidden();
});

it('requires authentication to access chat', function () {
    $this->get(route('research.chat'))
        ->assertRedirect(route('login'));
});

it('only shows conversations belonging to the user', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    // Create user's conversations
    for ($i = 0; $i < 2; $i++) {
        DB::table('agent_conversations')->insert([
            'id' => (string) Str::uuid7(),
            'user_id' => $user->id,
            'title' => "My Conversation {$i}",
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    // Create other user's conversations
    for ($i = 0; $i < 3; $i++) {
        DB::table('agent_conversations')->insert([
            'id' => (string) Str::uuid7(),
            'user_id' => $otherUser->id,
            'title' => "Other Conversation {$i}",
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    $this->actingAs($user)
        ->get(route('research.chat'))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->has('conversations', 2)
        );
});

it('deletes messages when conversation is deleted', function () {
    $user = User::factory()->create();

    $conversationId = (string) Str::uuid7();
    DB::table('agent_conversations')->insert([
        'id' => $conversationId,
        'user_id' => $user->id,
        'title' => 'Test Conversation',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $messageIds = [];
    for ($i = 0; $i < 3; $i++) {
        $messageId = (string) Str::uuid7();
        $messageIds[] = $messageId;
        DB::table('agent_conversation_messages')->insert([
            'id' => $messageId,
            'conversation_id' => $conversationId,
            'user_id' => $user->id,
            'agent' => 'App\\Agents\\ResearchAgent',
            'role' => 'user',
            'content' => "Message {$i}",
            'attachments' => '[]',
            'tool_calls' => '[]',
            'tool_results' => '[]',
            'usage' => '[]',
            'meta' => '[]',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    $this->actingAs($user)
        ->delete(route('research.chat.destroy', $conversationId));

    foreach ($messageIds as $messageId) {
        $this->assertDatabaseMissing('agent_conversation_messages', [
            'id' => $messageId,
        ]);
    }
});
