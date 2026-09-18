import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UnauthorizedException } from '../../common';

describe('AuthService', () => {
  let service: AuthService;
  let _usersService: UsersService;
  let _jwtService: JwtService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashed-password',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    validatePassword: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    _usersService = module.get<UsersService>(UsersService);
    _jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return access token and user data on successful login', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUsersService.validatePassword.mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt-token-123');

      const result = await service.login({
        email: 'test@example.com',
        password: 'correct-password',
      });

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(mockUsersService.validatePassword).toHaveBeenCalledWith(
        'correct-password',
        mockUser.password,
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
      expect(result).toEqual({
        accessToken: 'jwt-token-123',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          createdAt: mockUser.createdAt,
        },
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: 'password',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockUsersService.validatePassword).not.toHaveBeenCalled();
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUsersService.validatePassword.mockResolvedValue(false);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockUsersService.validatePassword).toHaveBeenCalledWith(
        'wrong-password',
        mockUser.password,
      );
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should use generic error message for security (same message for both cases)', async () => {
      // Test that both "user not found" and "wrong password" return same error
      mockUsersService.findByEmail.mockResolvedValue(null);

      let errorMessage1: string | undefined;
      try {
        await service.login({ email: 'x@x.com', password: 'x' });
      } catch (e) {
        errorMessage1 = (e as UnauthorizedException).message;
      }

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUsersService.validatePassword.mockResolvedValue(false);

      let errorMessage2: string | undefined;
      try {
        await service.login({ email: 'x@x.com', password: 'x' });
      } catch (e) {
        errorMessage2 = (e as UnauthorizedException).message;
      }

      // Both should have the same error message to prevent user enumeration
      expect(errorMessage1).toBe(errorMessage2);
      expect(errorMessage1).toBe('Invalid email or password');
    });
  });
});
