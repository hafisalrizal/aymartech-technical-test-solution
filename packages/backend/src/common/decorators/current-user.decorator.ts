import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FastifyRequest } from 'fastify';

/**
 * User payload attached to request after JWT validation
 */
export interface UserPayload {
  id: string;
  email: string;
}

/**
 * Parameter decorator that extracts the current user from the request.
 * Use after JwtAuthGuard to access the authenticated user.
 *
 * @example
 * ```typescript
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@CurrentUser() user: UserPayload) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: keyof UserPayload | undefined, ctx: ExecutionContext): UserPayload | unknown => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest & { user: UserPayload }>();
    const user = request.user;

    // If a specific property is requested, return just that property
    if (data) {
      return user?.[data];
    }

    return user;
  },
);
