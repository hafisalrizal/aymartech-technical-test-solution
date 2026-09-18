import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserPayload } from '../../../common';

/**
 * JWT payload structure stored in the token
 */
interface JwtPayload {
  sub: string;
  email: string;
}

/**
 * Passport strategy for validating JWT tokens.
 * Extracts token from Authorization header and validates against JWT_SECRET.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Validates the JWT payload and returns the user data.
   * This data will be attached to the request as `req.user`.
   */
  validate(payload: JwtPayload): UserPayload {
    return {
      id: payload.sub,
      email: payload.email,
    };
  }
}
