import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for message response.
 */
export class MessageResponseDto {
  @ApiProperty({
    description: 'Message ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Project ID this message belongs to',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  projectId: string;

  @ApiProperty({
    description: 'Message role (user or assistant)',
    example: 'user',
    enum: ['user', 'assistant'],
  })
  role: 'user' | 'assistant';

  @ApiProperty({
    description: 'Message content',
    example: 'What color palette would work for a premium SUV interior?',
  })
  content: string;

  @ApiProperty({
    description: 'When the message was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;
}
