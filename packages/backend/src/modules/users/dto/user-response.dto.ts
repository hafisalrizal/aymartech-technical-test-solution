import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for user data in API responses (excludes sensitive fields)
 */
export class UserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'test@lmesh.eu',
  })
  email: string;

  @ApiProperty({
    description: 'Account creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Account last update timestamp',
  })
  updatedAt: Date;
}
