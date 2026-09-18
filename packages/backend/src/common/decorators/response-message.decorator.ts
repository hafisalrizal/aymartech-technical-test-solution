import { SetMetadata } from '@nestjs/common';
import { RESPONSE_MESSAGE_KEY } from '../interceptors/transform-response.interceptor';

/**
 * Decorator to set a custom message in the response.
 *
 * @example
 * ```typescript
 * @Post()
 * @ResponseMessage('User created successfully')
 * create(@Body() dto: CreateUserDto) {
 *   return this.userService.create(dto);
 * }
 * ```
 */
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);
