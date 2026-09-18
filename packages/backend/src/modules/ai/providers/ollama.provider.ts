import { Logger } from '@nestjs/common';
import type { AiProvider, ChatMessage, AiProviderConfig } from '../ai.interface';
import { BadRequestException } from '../../../common';

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaResponse {
  message: {
    content: string;
  };
}

interface OllamaStreamChunk {
  message: {
    content: string;
  };
  done: boolean;
}

/**
 * Ollama AI provider implementation.
 * Uses local Ollama server for AI inference.
 * Great for development and testing without API costs.
 */
export class OllamaProvider implements AiProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly model: string;
  private readonly timeout: number;
  private readonly baseUrl: string;

  constructor(config: AiProviderConfig) {
    // Ollama doesn't need an API key, but we use it for base URL config
    this.baseUrl = config.apiKey || 'http://localhost:11434';
    this.model = config.model || 'llama3.2';
    this.timeout = config.timeout || 60000; // Longer timeout for local inference
  }

  /**
   * Sends a chat request and returns the complete response.
   */
  async chat(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: this.toOllamaMessages(messages, systemPrompt),
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as OllamaResponse;
      const text = data.message?.content || '';

      this.logger.debug(`Ollama response received: ${text.length} chars`);
      return text;
    } catch (error) {
      clearTimeout(timeoutId);
      this.handleError(error);
    }
  }

  /**
   * Sends a chat request and streams the response.
   */
  async *chatStream(
    messages: ChatMessage[],
    systemPrompt: string,
  ): AsyncIterable<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: this.toOllamaMessages(messages, systemPrompt),
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${error}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const chunk = JSON.parse(line) as OllamaStreamChunk;
            const content = chunk.message?.content;
            if (content) {
              yield content;
            }
            if (chunk.done) {
              clearTimeout(timeoutId);
              return;
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }

      clearTimeout(timeoutId);
      this.logger.debug('Ollama stream completed');
    } catch (error) {
      clearTimeout(timeoutId);
      this.handleError(error);
    }
  }

  /**
   * Converts chat messages to Ollama format.
   */
  private toOllamaMessages(
    messages: ChatMessage[],
    systemPrompt: string,
  ): OllamaMessage[] {
    const result: OllamaMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    for (const msg of messages) {
      if (msg.role === 'system') continue;
      result.push({
        role: msg.role,
        content: msg.content,
      });
    }

    return result;
  }

  /**
   * Handles errors from the Ollama API.
   */
  private handleError(error: unknown): never {
    this.logger.error('Ollama API error:', error);

    if (error instanceof BadRequestException) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new BadRequestException('AI request timed out. Please try again.');
      }
      if (error.message.includes('ECONNREFUSED')) {
        throw new BadRequestException(
          'Ollama server not running. Please start Ollama with: ollama serve',
        );
      }
      if (error.message.includes('model')) {
        throw new BadRequestException(
          `Ollama model not found. Pull it with: ollama pull ${this.model}`,
        );
      }
      throw new BadRequestException(`AI service error: ${error.message}`);
    }

    throw new BadRequestException('An unexpected error occurred with the AI service');
  }
}
