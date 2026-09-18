import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';

/**
 * Parses JWT_EXPIRES_IN env var to seconds.
 * Supports: '7d', '24h', '60m', '3600s', '3600', or number
 */
function parseExpiresIn(value: string | undefined): number {
  if (!value) return 60 * 60 * 24 * 7; // default: 7 days

  const num = parseInt(value, 10);
  if (!isNaN(num) && value === String(num)) {
    return num; // plain number (seconds)
  }

  const match = value.match(/^(\d+)(d|h|m|s)?$/);
  if (!match) return 60 * 60 * 24 * 7;

  const amount = parseInt(match[1], 10);
  const unit = match[2] || 's';

  switch (unit) {
    case 'd':
      return amount * 60 * 60 * 24;
    case 'h':
      return amount * 60 * 60;
    case 'm':
      return amount * 60;
    case 's':
    default:
      return amount;
  }
}

/**
 * Module handling user authentication.
 * Configures JWT and Passport for token-based auth.
 */
@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is not configured');
        }
        // JWT_EXPIRES_IN supports: '7d', '24h', '60m', '3600s', '3600'
        const expiresIn = parseExpiresIn(
          configService.get<string>('JWT_EXPIRES_IN'),
        );
        return {
          secret,
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
