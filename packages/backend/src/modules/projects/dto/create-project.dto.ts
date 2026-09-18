import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for creating a new project
 */
export class CreateProjectDto {
  @ApiProperty({
    description: 'Project title',
    example: 'Premium SUV Interior',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    description: 'Project description with design context',
    example: 'Warm earth tones, matte leather, sustainable materials',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
