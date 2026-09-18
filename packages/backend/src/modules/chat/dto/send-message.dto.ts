import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * DTO for sending a chat message.
 */
export class SendMessageDto {
  @ApiProperty({
    description: 'The message content to send to the AI',
    example: 'What color palette would work for a premium SUV interior?',
    maxLength: 10000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;
}
