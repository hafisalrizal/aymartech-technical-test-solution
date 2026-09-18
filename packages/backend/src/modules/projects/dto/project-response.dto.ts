import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for project data in API responses
 */
export class ProjectResponseDto {
  @ApiProperty({
    description: 'Project ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Project title',
    example: 'Premium SUV Interior',
  })
  title: string;

  @ApiPropertyOptional({
    description: 'Project description',
    example: 'Warm earth tones, matte leather, sustainable materials',
  })
  description: string | null;

  @ApiProperty({
    description: 'Owner user ID',
  })
  userId: string;

  @ApiProperty({
    description: 'Number of messages in the project',
    example: 5,
  })
  messageCount: number;

  @ApiProperty({
    description: 'Project creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Project last update timestamp',
  })
  updatedAt: Date;
}
