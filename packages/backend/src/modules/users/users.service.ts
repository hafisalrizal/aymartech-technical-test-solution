import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '../../common';

/**
 * Service handling user-related business logic and database operations.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a user by their email address.
   *
   * @param email - User's email address
   * @returns User record or null if not found
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Finds a user by their ID.
   *
   * @param id - User's UUID
   * @returns User record
   * @throws NotFoundException if user not found
   */
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User');
    }

    return user;
  }

  /**
   * Finds a user by ID and returns without password.
   *
   * @param id - User's UUID
   * @returns User record without password field
   */
  async findByIdSafe(id: string) {
    const user = await this.findById(id);
    return this.excludePassword(user);
  }

  /**
   * Validates a plain text password against a hashed password.
   *
   * @param plainPassword - Plain text password to validate
   * @param hashedPassword - Bcrypt hash to compare against
   * @returns True if password matches
   */
  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Hashes a plain text password using bcrypt.
   *
   * @param password - Plain text password
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Removes password field from user object.
   *
   * @param user - User object with password
   * @returns User object without password
   */
  private excludePassword<T extends { password: string }>(
    user: T,
  ): Omit<T, 'password'> {
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
