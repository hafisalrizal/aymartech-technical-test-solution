import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for updating an existing project
 */
export class UpdateProjectDto {
  @ApiPropertyOptional({
    description: 'Project title',
    example: 'Premium SUV Interior',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Project description with design context',
    example: 'Warm earth tones, matte leather, sustainable materials',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
