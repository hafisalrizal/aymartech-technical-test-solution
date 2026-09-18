import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ProjectsService } from '../projects/projects.service';
import { MessageResponseDto } from './dto';
import type { ChatMessage } from '../ai/ai.interface';

/** Maximum number of messages to include in AI context */
const MAX_CONTEXT_MESSAGES = 20;

/** System prompt template for the AI assistant */
const SYSTEM_PROMPT_TEMPLATE = `You are an AI design assistant for automotive designers.
You help with design direction, colour-material-finish (CMF) themes, and material choices.

Project Context:
Title: {{title}}
Description: {{description}}

Help the designer think through options and make decisions.
Be concise and specific to automotive interior design.`;

/** System prompt for summarization */
const SUMMARIZE_PROMPT = `You are an AI design assistant. Based on the conversation history, provide a concise summary of the key design decisions that have been made or discussed. Focus on:
- Color choices
- Material selections
- Finish preferences
- Design direction decisions

Be specific and actionable. List the decisions as bullet points.`;

/**
 * Service handling chat-related operations with AI integration.
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly projectsService: ProjectsService,
  ) {}

  /**
   * Gets all messages for a project.
   *
   * @param projectId - Project ID
   * @param userId - Owner's user ID
   * @returns List of messages in chronological order
   */
  async getMessages(
    projectId: string,
    userId: string,
  ): Promise<MessageResponseDto[]> {
    // Verify project exists and belongs to user
    await this.projectsService.findOne(projectId, userId);

    const messages = await this.prisma.message.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((msg) => this.toResponseDto(msg));
  }

  /**
   * Sends a user message and streams the AI response.
   * Saves both user message and AI response to the database.
   *
   * @param projectId - Project ID
   * @param userId - Owner's user ID
   * @param content - User message content
   * @returns Async iterable of AI response chunks
   */
  async *chat(
    projectId: string,
    userId: string,
    content: string,
  ): AsyncGenerator<string, MessageResponseDto> {
    // Verify project exists and belongs to user
    const project = await this.projectsService.findOne(projectId, userId);

    // Save user message
    const userMessage = await this.prisma.message.create({
      data: {
        role: 'user',
        content,
        projectId,
      },
    });

    this.logger.debug(`User message saved: ${userMessage.id}`);

    // Get conversation history (limited)
    const history = await this.getContextMessages(projectId);

    // Build system prompt with project context
    const systemPrompt = this.buildSystemPrompt(project.title, project.description);

    // Stream AI response
    let fullResponse = '';
    try {
      for await (const chunk of this.aiService.chatStream(history, systemPrompt)) {
        fullResponse += chunk;
        yield chunk;
      }
    } catch (error) {
      this.logger.error('AI streaming error:', error);
      // Save error message as assistant response
      const errorMessage = await this.prisma.message.create({
        data: {
          role: 'assistant',
          content: 'I apologize, but I encountered an error processing your request. Please try again.',
          projectId,
        },
      });
      return this.toResponseDto(errorMessage);
    }

    // Save AI response
    const assistantMessage = await this.prisma.message.create({
      data: {
        role: 'assistant',
        content: fullResponse,
        projectId,
      },
    });

    this.logger.debug(`Assistant message saved: ${assistantMessage.id}`);

    return this.toResponseDto(assistantMessage);
  }

  /**
   * Generates a summary of design decisions from the conversation.
   *
   * @param projectId - Project ID
   * @param userId - Owner's user ID
   * @returns Async iterable of summary chunks
   */
  async *summarize(
    projectId: string,
    userId: string,
  ): AsyncGenerator<string, MessageResponseDto> {
    // Verify project exists and belongs to user
    await this.projectsService.findOne(projectId, userId);

    // Get all messages for context
    const messages = await this.prisma.message.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    if (messages.length === 0) {
      const emptyMessage = await this.prisma.message.create({
        data: {
          role: 'assistant',
          content: 'No conversation history to summarize yet. Start chatting to build design decisions!',
          projectId,
        },
      });
      yield emptyMessage.content;
      return this.toResponseDto(emptyMessage);
    }

    // Convert to chat messages format
    const chatMessages: ChatMessage[] = messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // Add summarize request
    chatMessages.push({
      role: 'user',
      content: 'Please summarize the key design decisions from our conversation.',
    });

    // Stream summary
    let fullSummary = '';
    try {
      for await (const chunk of this.aiService.chatStream(chatMessages, SUMMARIZE_PROMPT)) {
        fullSummary += chunk;
        yield chunk;
      }
    } catch (error) {
      this.logger.error('AI summarization error:', error);
      const errorMessage = await this.prisma.message.create({
        data: {
          role: 'assistant',
          content: 'I apologize, but I encountered an error generating the summary. Please try again.',
          projectId,
        },
      });
      return this.toResponseDto(errorMessage);
    }

    // Save summary as assistant message
    const summaryMessage = await this.prisma.message.create({
      data: {
        role: 'assistant',
        content: fullSummary,
        projectId,
      },
    });

    this.logger.debug(`Summary message saved: ${summaryMessage.id}`);

    return this.toResponseDto(summaryMessage);
  }

  /**
   * Resets the conversation by deleting all messages.
   * Project itself is preserved.
   *
   * @param projectId - Project ID
   * @param userId - Owner's user ID
   */
  async resetConversation(projectId: string, userId: string): Promise<void> {
    // Verify project exists and belongs to user
    await this.projectsService.findOne(projectId, userId);

    const result = await this.prisma.message.deleteMany({
      where: { projectId },
    });

    this.logger.log(`Conversation reset: ${result.count} messages deleted from project ${projectId}`);
  }

  /**
   * Gets recent messages for AI context (limited to MAX_CONTEXT_MESSAGES).
   */
  private async getContextMessages(projectId: string): Promise<ChatMessage[]> {
    const messages = await this.prisma.message.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: MAX_CONTEXT_MESSAGES,
    });

    // Reverse to chronological order
    return messages.reverse().map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));
  }

  /**
   * Builds the system prompt with project context.
   */
  private buildSystemPrompt(title: string, description: string | null): string {
    return SYSTEM_PROMPT_TEMPLATE
      .replace('{{title}}', title)
      .replace('{{description}}', description || 'No description provided');
  }

  /**
   * Converts a Prisma message to response DTO.
   */
  private toResponseDto(message: {
    id: string;
    projectId: string;
    role: string;
    content: string;
    createdAt: Date;
  }): MessageResponseDto {
    return {
      id: message.id,
      projectId: message.projectId,
      role: message.role as 'user' | 'assistant',
      content: message.content,
      createdAt: message.createdAt,
    };
  }
}
