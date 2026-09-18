import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { ChatService } from './chat.service';
import { SendMessageDto, MessageResponseDto } from './dto';
import type { UserPayload } from '../../common';
import {
  JwtAuthGuard,
  CurrentUser,
  SkipTransform,
  ApiErrorResponseDto,
} from '../../common';

/**
 * Controller handling chat operations with AI integration.
 * Supports SSE streaming for real-time AI responses.
 */
@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Gets conversation history for a project.
   */
  @Get('messages')
  @ApiOperation({
    summary: 'Get messages',
    description: 'Get all messages in the conversation for a project',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'List of messages',
    type: [MessageResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Project not found',
    type: ApiErrorResponseDto,
  })
  async getMessages(
    @CurrentUser() user: UserPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<MessageResponseDto[]> {
    return this.chatService.getMessages(projectId, user.id);
  }

  /**
   * Sends a message and streams the AI response via SSE.
   */
  @Post('chat')
  @SkipTransform()
  @ApiOperation({
    summary: 'Send message',
    description: 'Send a message to the AI and receive a streaming response via SSE',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'SSE stream of AI response chunks',
    content: {
      'text/event-stream': {
        schema: {
          type: 'string',
          example: 'data: {"chunk":"Hello"}\n\ndata: {"chunk":" there"}\n\ndata: [DONE]\n\n',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Project not found',
    type: ApiErrorResponseDto,
  })
  async chat(
    @CurrentUser() user: UserPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: SendMessageDto,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    try {
      const generator = this.chatService.chat(projectId, user.id, dto.content);

      for await (const chunk of generator) {
        // Send chunk as SSE data
        reply.raw.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }

      // Send done signal
      reply.raw.write('data: [DONE]\n\n');
    } catch (error) {
      // Send error as SSE
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.raw.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    } finally {
      reply.raw.end();
    }
  }

  /**
   * Generates a summary of design decisions via SSE.
   */
  @Post('chat/summarize')
  @SkipTransform()
  @ApiOperation({
    summary: 'Summarize conversation',
    description: 'Generate a summary of key design decisions from the conversation',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'SSE stream of summary chunks',
    content: {
      'text/event-stream': {
        schema: {
          type: 'string',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Project not found',
    type: ApiErrorResponseDto,
  })
  async summarize(
    @CurrentUser() user: UserPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    try {
      const generator = this.chatService.summarize(projectId, user.id);

      for await (const chunk of generator) {
        reply.raw.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }

      reply.raw.write('data: [DONE]\n\n');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      reply.raw.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    } finally {
      reply.raw.end();
    }
  }

  /**
   * Resets the conversation by deleting all messages.
   */
  @Delete('chat')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Reset conversation',
    description: 'Delete all messages in the conversation. The project itself is preserved.',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 204,
    description: 'Conversation reset successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Project not found',
    type: ApiErrorResponseDto,
  })
  async resetConversation(
    @CurrentUser() user: UserPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<void> {
    await this.chatService.resetConversation(projectId, user.id);
  }
}
