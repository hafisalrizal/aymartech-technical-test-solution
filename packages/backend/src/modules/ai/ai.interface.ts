/**
 * Chat message structure for AI conversations.
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Configuration options for AI providers.
 */
export interface AiProviderConfig {
  apiKey: string;
  model?: string;
  timeout?: number;
}

/**
 * Abstract interface for AI providers.
 * All providers must implement this interface to be swappable.
 */
export interface AiProvider {
  /**
   * Sends a chat request and returns the complete response.
   *
   * @param messages - Conversation history
   * @param systemPrompt - System instructions for the AI
   * @returns Complete AI response text
   */
  chat(messages: ChatMessage[], systemPrompt: string): Promise<string>;

  /**
   * Sends a chat request and streams the response.
   *
   * @param messages - Conversation history
   * @param systemPrompt - System instructions for the AI
   * @returns Async iterable of response chunks
   */
  chatStream(
    messages: ChatMessage[],
    systemPrompt: string,
  ): AsyncIterable<string>;
}

/**
 * Token for dependency injection of AI provider.
 */
export const AI_PROVIDER = 'AI_PROVIDER';

/**
 * Supported AI provider types.
 */
export type AiProviderType = 'gemini' | 'openrouter' | 'ollama';
