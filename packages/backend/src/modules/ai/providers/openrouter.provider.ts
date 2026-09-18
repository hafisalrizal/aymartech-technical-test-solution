import { Logger } from '@nestjs/common';
import type { AiProvider, ChatMessage, AiProviderConfig } from '../ai.interface';
import { BadRequestException } from '../../../common';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface OpenRouterStreamChunk {
  choices: Array<{
    delta: {
      content?: string;
    };
  }>;
}

/**
 * OpenRouter AI provider implementation.
 * Uses OpenAI-compatible API to access various models.
 */
export class OpenRouterProvider implements AiProvider {
  private readonly logger = new Logger(OpenRouterProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeout: number;
  private readonly baseUrl = 'https://openrouter.ai/api/v1';

  constructor(config: AiProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'google/gemini-flash-1.5';
    this.timeout = config.timeout || 30000;
  }

  /**
   * Sends a chat request and returns the complete response.
   */
  async chat(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://designpilot.app',
          'X-Title': 'DesignPilot AI Assistant',
        },
        body: JSON.stringify({
          model: this.model,
          messages: this.toOpenRouterMessages(messages, systemPrompt),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
      }

      const data = (await response.json()) as OpenRouterResponse;
      const text = data.choices[0]?.message?.content || '';

      this.logger.debug(`OpenRouter response received: ${text.length} chars`);
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
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://designpilot.app',
          'X-Title': 'DesignPilot AI Assistant',
        },
        body: JSON.stringify({
          model: this.model,
          messages: this.toOpenRouterMessages(messages, systemPrompt),
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
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
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const chunk = JSON.parse(data) as OpenRouterStreamChunk;
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }
      }

      clearTimeout(timeoutId);
      this.logger.debug('OpenRouter stream completed');
    } catch (error) {
      clearTimeout(timeoutId);
      this.handleError(error);
    }
  }

  /**
   * Converts chat messages to OpenRouter format.
   */
  private toOpenRouterMessages(
    messages: ChatMessage[],
    systemPrompt: string,
  ): OpenRouterMessage[] {
    const result: OpenRouterMessage[] = [
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
   * Handles errors from the OpenRouter API.
   */
  private handleError(error: unknown): never {
    this.logger.error('OpenRouter API error:', error);

    if (error instanceof BadRequestException) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new BadRequestException('AI request timed out. Please try again.');
      }
      if (error.message.includes('401')) {
        throw new BadRequestException('AI service configuration error');
      }
      if (error.message.includes('429')) {
        throw new BadRequestException('AI service rate limited. Please try again later.');
      }
      throw new BadRequestException(`AI service error: ${error.message}`);
    }

    throw new BadRequestException('An unexpected error occurred with the AI service');
  }
}
