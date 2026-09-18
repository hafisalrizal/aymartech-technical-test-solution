# Architecture Decisions

This document explains key architectural decisions made during the development of the AI Design Brief Assistant.

---

## 1. AI Integration

**How is the AI integration structured?**

The AI integration follows the **Strategy Pattern** with a clean abstraction layer in `src/modules/ai/`. The `AiProvider` interface (`ai.interface.ts`) defines a contract that all AI providers must implement:

```typescript
interface AiProvider {
  chat(messages: ChatMessage[], systemPrompt: string): Promise<string>;
  chatStream(messages: ChatMessage[], systemPrompt: string): AsyncIterable<string>;
}
```

Three provider implementations exist in `src/modules/ai/providers/`:
- `GeminiProvider` - Google's Gemini API using `@google/generative-ai` SDK
- `OpenRouterProvider` - OpenAI-compatible API supporting multiple models
- `OllamaProvider` - Local inference server for offline development

The `AiService` acts as a factory, selecting the provider based on the `AI_PROVIDER` environment variable at startup.

**How would you swap AI providers?**

To change providers: set `AI_PROVIDER=openrouter` (or `gemini`, `ollama`) in the environment. To add a new provider:
1. Create a new class implementing `AiProvider` in `src/modules/ai/providers/`
2. Add it to the switch statement in `AiService.initializeProvider()`

No other code changes required - the rest of the application is provider-agnostic.

**How are malformed AI responses handled?**

Each provider wraps API calls in try-catch blocks. Errors are logged with context and re-thrown as `BadRequestException` with user-friendly messages. For streaming responses, if parsing fails mid-stream, the accumulated content is still saved to the database. Safety filter blocks (Gemini) and rate limits (OpenRouter) are detected and handled with appropriate error messages. See `gemini.provider.ts:41-58` and `openrouter.provider.ts:60-75` for implementation details.

---

## 2. Streaming Implementation

**How does progressive response rendering work end-to-end?**

1. **Client** sends `POST /api/v1/projects/:id/chat` with message content
2. **ChatController** calls `ChatService.chat()` which returns an `AsyncGenerator<string>`
3. **ChatController** writes SSE headers via Fastify's raw response:
   ```typescript
   reply.raw.writeHead(200, {
     'Content-Type': 'text/event-stream',
     'Cache-Control': 'no-cache',
     'Connection': 'keep-alive',
   });
   ```
4. **ChatService** saves the user message, builds the system prompt with project context, then iterates the AI provider's stream
5. Each chunk is yielded to the controller, which writes `data: {"chunk": "..."}\n\n` to the SSE stream
6. When complete, `data: [DONE]\n\n` is sent, and the full response is saved to the database
7. **Frontend** uses `fetch()` with `ReadableStream` (or `EventSource`) to progressively display chunks

See `chat.controller.ts:51-82` and `chat.service.ts:75-132` for the implementation.

**What are the trade-offs?**

| Approach | Pros | Cons |
|----------|------|------|
| **SSE (chosen)** | Simple, works over HTTP/1.1, automatic reconnection, browser-native `EventSource` support | Unidirectional (server to client only), limited to text data |
| WebSocket | Bidirectional, binary support | More complex, requires sticky sessions, manual reconnection logic |
| Long Polling | Maximum compatibility | Higher latency, server resource overhead |

SSE was chosen because chat streaming is inherently unidirectional (AI responds to user), and SSE provides the simplest implementation with good browser support.

---

## 3. Conversation Context

**How does the AI know about the project context?**

Each chat request builds a system prompt using the project's title and description:

```typescript
const SYSTEM_PROMPT_TEMPLATE = `You are an AI design assistant for automotive designers.
You help with design direction, colour-material-finish (CMF) themes, and material choices.

Project Context:
Title: {{title}}
Description: {{description}}

Help the designer think through options and make decisions.
Be concise and specific to automotive interior design.`;
```

This is implemented in `ChatService.buildSystemPrompt()` at `chat.service.ts:246-253`.

**How is conversation history length managed?**

The `getContextMessages()` method limits history to the most recent 20 messages (`MAX_CONTEXT_MESSAGES = 20`). This prevents token limit issues while maintaining conversational coherence:

```typescript
const messages = await this.prisma.message.findMany({
  where: { projectId },
  orderBy: { createdAt: 'desc' },
  take: MAX_CONTEXT_MESSAGES,
});
return messages.reverse(); // Chronological order for AI
```

See `chat.service.ts:229-244`. The limit of 20 messages balances context retention with API costs and latency.

---

## 4. State Management

**Where is state stored and why?**

| State Type | Location | Rationale |
|------------|----------|-----------|
| **Conversation messages** | PostgreSQL (server) | Source of truth, persistence across sessions, required for AI context |
| **User session** | JWT token (client) | Stateless authentication, scalable, no server session storage |
| **Project list/details** | Server with client cache (TanStack Query) | Server owns data, client caches for performance |
| **UI state** | React state (client) | Ephemeral, component-specific, no persistence needed |

**Example decision: Message storage**

Messages are stored server-side because:
1. AI context requires message history - the AI cannot stream responses without seeing previous messages
2. Users expect conversations to persist across devices and sessions
3. The "summarize" feature needs access to the full conversation history

The frontend caches messages via TanStack Query but always considers the server as the source of truth. On new message send, the cache is invalidated to fetch fresh data. This ensures consistency while providing responsive UI.

---

## 5. What Would You Do Differently

**With 2 more days, what would you refactor or add?**

1. **Token counting and context optimization** - Implement actual token counting (using `tiktoken` or similar) instead of a fixed message limit. This would maximize context window usage without exceeding limits. Currently, 20 messages might be too few for complex discussions or too many if messages are lengthy.

2. **Rate limiting** - Add rate limiting on AI endpoints to prevent abuse and control costs. Currently, any authenticated user can make unlimited AI requests. Would implement using `@nestjs/throttler` with per-user limits.

3. **Conversation branching** - Allow users to "fork" a conversation from any point, exploring alternative design directions without losing the original thread. This would require a tree structure for messages instead of a linear list.

4. **Image upload support** - Automotive design discussions often reference visual materials. Adding image upload with multimodal AI support (Gemini Vision) would make the assistant more practical for real design work.

5. **WebSocket for typing indicators** - While SSE works well for streaming responses, real-time typing indicators ("AI is thinking...") would improve perceived responsiveness. This would require WebSocket integration alongside the existing SSE implementation.

6. **Comprehensive error recovery** - Add retry logic with exponential backoff for transient AI provider failures. Currently, a failed request requires manual retry by the user.
