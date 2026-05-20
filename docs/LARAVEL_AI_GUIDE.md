# Laravel AI Package Guide

This document explains how Larryconn uses the `laravel/ai` package and demonstrates why it makes building AI-powered applications incredibly easy.

## Table of Contents

1. [Overview](#overview)
2. [Key Concepts](#key-concepts)
3. [Feature Breakdown](#feature-breakdown)
4. [Code Comparison: With vs Without Laravel AI](#code-comparison)
5. [Architecture](#architecture)

---

## Overview

The Laravel AI package provides a unified, elegant interface for building AI-powered applications. It handles:

- **Multiple AI Providers** - OpenAI, Anthropic, Gemini, Groq, etc.
- **Agents** - Encapsulate AI behavior with instructions, tools, and conversation handling
- **Streaming** - Real-time token streaming with automatic SSE response handling
- **Provider Tools** - FileSearch (vector stores) and WebSearch built-in
- **Vector Stores** - Managed semantic search without pgvector setup
- **Conversations** - Automatic message persistence and history management

---

## Key Concepts

### 1. Agents

Agents are classes that encapsulate AI behavior. They implement interfaces that define their capabilities:

```php
#[Provider('openai')]
#[Temperature(0.7)]
class ResearchAgent implements Agent, Conversational, HasMiddleware, HasTools
{
    use Promptable;
    use RemembersConversations;

    public function instructions(): string
    {
        return 'You are a research assistant...';
    }

    public function tools(): iterable
    {
        return [
            new FileSearch([$this->user->vector_store_id]),
            new WebSearch(),
        ];
    }

    public function middleware(): array
    {
        return [RememberConversation::class];
    }
}
```

### 2. Streaming Responses

The `StreamableAgentResponse` implements Laravel's `Responsable` interface, so you can return it directly from controllers:

```php
// This single line handles:
// - SSE response headers
// - Token-by-token streaming
// - Tool execution events
// - Conversation persistence (via middleware)
return $agent->stream($message);
```

### 3. Vector Stores & Files

OpenAI's managed vector stores handle chunking, embedding, and indexing automatically:

```php
// Create a store for the user
$store = Stores::create("user-{$user->id}-research");
$user->update(['vector_store_id' => $store->id]);

// Upload and index a file - OpenAI handles the rest
$file = Files::put(new LocalDocument($path));
$store->add($file->id);
```

### 4. Provider Tools

The AI autonomously decides when to use tools based on the query:

```php
public function tools(): iterable
{
    return [
        // Searches user's vector store
        new FileSearch([$this->user->vector_store_id]),

        // Searches the web for current information
        new WebSearch(),
    ];
}
```

---

## Feature Breakdown

### Streaming (`StreamableAgentResponse`)

| What it handles | How |
|-----------------|-----|
| SSE Headers | `Content-Type: text/event-stream` |
| Token streaming | Yields `text_delta` events as they arrive |
| Tool events | Emits `tool_call` and `tool_result` events |
| Completion | Sends `[DONE]` and runs `then()` callbacks |

**Frontend consumption:**
```typescript
const response = await fetch('/research/chat', { method: 'POST', ... });
const reader = response.body?.getReader();

while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // Each line is: data: {"type": "text_delta", "delta": "Hello"}
    const event = JSON.parse(line.slice(6));
    if (event.type === 'text_delta') {
        content += event.delta;
    }
}
```

### Conversations (`RemembersConversations` + `RememberConversation`)

The trait + middleware combo provides:

1. **`forUser($user)`** - Start a new conversation
2. **`continue($id, $user)`** - Resume existing conversation
3. **`messages()`** - Auto-loads history into AI context
4. **Auto-persistence** - Middleware saves messages after streaming

**Database tables (auto-created):**
- `agent_conversations` - Conversation metadata
- `agent_conversation_messages` - Messages with tool_calls, usage, etc.

### Vector Stores

OpenAI's vector stores provide:

- Automatic text extraction from PDFs, images, etc.
- Chunking and embedding generation
- Semantic similarity search
- No pgvector or database vectors needed

```php
// The FileSearch tool queries the store automatically
new FileSearch([$user->vector_store_id])
```

### Vision / Multi-modal

Analyze images using attachments:

```php
$response = $agent->prompt(
    'Describe this image in detail',
    attachments: [new LocalImage($imagePath)]
);
```

---

## Code Comparison

### With Laravel AI Package

**Controller (5 lines of logic):**
```php
public function message(SendMessageRequest $request): StreamableAgentResponse
{
    $agent = new ResearchAgent($request->user());

    $conversationId
        ? $agent->continue($conversationId, $request->user())
        : $agent->forUser($request->user());

    return $agent->stream($request->validated('message'));
}
```

**Agent (30 lines):**
```php
#[Provider('openai')]
class ResearchAgent implements Agent, Conversational, HasMiddleware, HasTools
{
    use Promptable, RemembersConversations;

    public function __construct(protected User $user) {}

    public function instructions(): string { return '...'; }

    public function middleware(): array
    {
        return [RememberConversation::class];
    }

    public function tools(): iterable
    {
        return [
            new FileSearch([$this->user->vector_store_id]),
            new WebSearch(),
        ];
    }
}
```

**Total: ~35 lines**

### Without Laravel AI Package (Manual Implementation)

See the `manual-implementation` branch for the full code. Summary:

| Component | Lines of Code |
|-----------|---------------|
| OpenAI API client service | ~150 lines |
| Streaming response handler | ~100 lines |
| Tool execution loop | ~80 lines |
| Conversation persistence | ~60 lines |
| Vector store management | ~120 lines |
| SSE response formatting | ~40 lines |
| **Total** | **~550 lines** |

**The Laravel AI package reduces this to ~35 lines** - a **94% reduction** in code.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Chat UI     │  │ Research    │  │ Feature Badges          │ │
│  │ (Streaming) │  │ Library     │  │ (Educational tooltips)  │ │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────────────┘ │
└─────────┼────────────────┼──────────────────────────────────────┘
          │                │
          ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Laravel Controllers                          │
│  ┌──────────────────────┐  ┌────────────────────────────────┐  │
│  │ ConversationController│  │ ResearchController             │  │
│  │ • Returns stream     │  │ • Handles uploads              │  │
│  │ • 5 lines of logic   │  │ • Dispatches analysis job      │  │
│  └──────────┬───────────┘  └────────────────┬───────────────┘  │
└─────────────┼───────────────────────────────┼───────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Laravel AI Package                         │
│  ┌─────────────────┐  ┌─────────────┐  ┌──────────────────┐    │
│  │ ResearchAgent   │  │ Stores      │  │ Files            │    │
│  │ • Instructions  │  │ • create()  │  │ • put()          │    │
│  │ • Tools         │  │ • add()     │  │ • LocalDocument  │    │
│  │ • Middleware    │  └─────────────┘  └──────────────────┘    │
│  └────────┬────────┘                                            │
│           │                                                     │
│  ┌────────┴────────┐                                            │
│  │ Provider Tools  │                                            │
│  │ • FileSearch    │◄─── Queries user's vector store            │
│  │ • WebSearch     │◄─── Searches the web                       │
│  └─────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         OpenAI API                              │
│  • Chat Completions (streaming)                                 │
│  • Vector Stores (managed)                                      │
│  • File uploads & processing                                    │
│  • Vision model for image analysis                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Events (For Observability)

The package dispatches events you can listen to:

| Event | When |
|-------|------|
| `PromptingAgent` | Before AI is prompted |
| `AgentPrompted` | After response received |
| `InvokingTool` | Before tool execution |
| `ToolInvoked` | After tool returns result |
| `StreamingAgent` | Stream started |
| `AgentStreamed` | Stream completed |

**Example listener:**
```php
Event::listen(ToolInvoked::class, function ($event) {
    Log::info('Tool used', [
        'tool' => $event->tool::class,
        'arguments' => $event->arguments,
        'result_length' => strlen($event->result),
    ]);
});
```

---

## Database Compatibility

| Database | Supported | Notes |
|----------|-----------|-------|
| SQLite | ✅ | Vector storage is on OpenAI, not in your DB |
| PostgreSQL | ✅ | Full support |
| MySQL | ✅ | Full support |

The `SimilaritySearch` tool (for local pgvector) is available but optional - we use OpenAI's managed vector stores instead.

---

## Summary

The Laravel AI package embodies Laravel's philosophy of elegant, expressive code. What would traditionally require hundreds of lines of boilerplate - API clients, streaming handlers, tool execution loops, conversation management - is reduced to a few lines of declarative code.

**Key benefits:**
1. **Declarative agents** - Define behavior with interfaces and attributes
2. **Automatic streaming** - Return the response, Laravel handles SSE
3. **Built-in tools** - FileSearch and WebSearch work out of the box
4. **Managed vectors** - No pgvector setup needed
5. **Conversation memory** - Middleware handles persistence
6. **Provider flexibility** - Switch between OpenAI, Anthropic, etc.

This is AI integration done the Laravel way.
