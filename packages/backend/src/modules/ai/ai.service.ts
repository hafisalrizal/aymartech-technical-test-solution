import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiProvider, ChatMessage, AiProviderType } from './ai.interface';
import { GeminiProvider, OpenRouterProvider, OllamaProvider } from './providers';

/**
 * AI service that provides a unified interface to AI providers.
 * Uses factory pattern to select provider based on configuration.
 */
@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private provider!: AiProvider;
  private providerType!: AiProviderType;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Initializes the AI provider on module startup.
   */
  onModuleInit() {
    this.initializeProvider();
  }

  /**
   * Sends a chat request and returns the complete response.
   *
   * @param messages - Conversation history
   * @param systemPrompt - System instructions for the AI
   * @returns Complete AI response text
   */
  async chat(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    this.logger.debug(
      `Chat request: ${messages.length} messages, provider: ${this.providerType}`,
    );
    return this.provider.chat(messages, systemPrompt);
  }

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
  ): AsyncIterable<string> {
    this.logger.debug(
      `Stream request: ${messages.length} messages, provider: ${this.providerType}`,
    );
    return this.provider.chatStream(messages, systemPrompt);
  }

  /**
   * Gets the current AI provider type.
   */
  getProviderType(): AiProviderType {
    return this.providerType;
  }

  /**
   * Initializes the AI provider based on configuration.
   * Uses factory pattern to create the appropriate provider instance.
   * Validates API key presence for providers that require it.
   *
   * @throws Error if required API key is missing (fails fast at startup)
   */
  private initializeProvider(): void {
    const providerType = this.configService.get<string>('ai.provider') || 'gemini';
    const apiKey = this.configService.get<string>('ai.apiKey') || '';
    const model = this.configService.get<string>('ai.model');
    const timeout = this.configService.get<number>('ai.timeout');

    // Validate API key for providers that require it
    const requiresApiKey = ['gemini', 'openrouter'];
    if (requiresApiKey.includes(providerType) && !apiKey) {
      throw new Error(
        `AI_API_KEY environment variable is required for ${providerType} provider`,
      );
    }

    const config = { apiKey, model, timeout };

    switch (providerType) {
      case 'gemini':
        this.provider = new GeminiProvider(config);
        this.providerType = 'gemini';
        break;

      case 'openrouter':
        this.provider = new OpenRouterProvider(config);
        this.providerType = 'openrouter';
        break;

      case 'ollama':
        this.provider = new OllamaProvider(config);
        this.providerType = 'ollama';
        break;

      default:
        throw new Error(
          `Unknown AI provider: ${providerType}. Supported: gemini, openrouter, ollama`,
        );
    }

    this.logger.log(`AI provider initialized: ${this.providerType}`);
  }
}
