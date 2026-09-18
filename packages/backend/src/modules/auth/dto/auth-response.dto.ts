import { ApiProperty } from '@nestjs/swagger';

/**
 * User data returned in auth responses (excludes sensitive fields)
 */
export class UserDto {
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
}

/**
 * DTO for successful authentication response
 */
export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Authenticated user data',
    type: UserDto,
  })
  user: UserDto;
}
