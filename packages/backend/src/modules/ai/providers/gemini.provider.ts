import { Logger } from '@nestjs/common';
import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import type { AiProvider, ChatMessage, AiProviderConfig } from '../ai.interface';
import { BadRequestException } from '../../../common';

/**
 * Gemini AI provider implementation.
 * Uses Google's Generative AI SDK for chat and streaming.
 */
export class GeminiProvider implements AiProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly client: GoogleGenerativeAI;
  private readonly model: string;
  private readonly timeout: number;

  constructor(config: AiProviderConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || 'gemini-3.6-flash';
    this.timeout = config.timeout || 30000;
  }

  /**
   * Sends a chat request and returns the complete response.
   */
  async chat(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const model = this.client.getGenerativeModel({
        model: this.model,
        systemInstruction: systemPrompt,
      });

      const history = this.toGeminiHistory(messages);
      const chat = model.startChat({ history });

      // Get the last user message
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'user') {
        throw new BadRequestException('Last message must be from user');
      }

      const result = await chat.sendMessage(lastMessage.content, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const response = result.response;
      const text = response.text();

      this.logger.debug(`Gemini response received: ${text.length} chars`);
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
      const model = this.client.getGenerativeModel({
        model: this.model,
        systemInstruction: systemPrompt,
      });

      const history = this.toGeminiHistory(messages);
      const chat = model.startChat({ history });

      // Get the last user message
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'user') {
        throw new BadRequestException('Last message must be from user');
      }

      const result = await chat.sendMessageStream(lastMessage.content, {
        signal: controller.signal,
      });

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }

      clearTimeout(timeoutId);
      this.logger.debug('Gemini stream completed');
    } catch (error) {
      clearTimeout(timeoutId);
      this.handleError(error);
    }
  }

  /**
   * Converts chat messages to Gemini history format.
   * Excludes the last message (sent separately) and system messages.
   */
  private toGeminiHistory(messages: ChatMessage[]): Content[] {
    // Exclude the last message (it will be sent as the current message)
    const historyMessages = messages.slice(0, -1);

    return historyMessages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));
  }

  /**
   * Handles errors from the Gemini API.
   */
  private handleError(error: unknown): never {
    this.logger.error('Gemini API error:', error);

    if (error instanceof BadRequestException) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        throw new BadRequestException('AI request timed out. Please try again.');
      }
      if (error.message.includes('API_KEY')) {
        throw new BadRequestException('AI service configuration error');
      }
      if (error.message.includes('SAFETY')) {
        throw new BadRequestException(
          'Response blocked due to safety filters. Please rephrase your message.',
        );
      }
      throw new BadRequestException(`AI service error: ${error.message}`);
    }

    throw new BadRequestException('An unexpected error occurred with the AI service');
  }
}
