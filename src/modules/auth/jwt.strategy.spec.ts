import { ForbiddenException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { UserRole, UserStatus } from './entities/user.entity';
import { ConfigService } from '@nestjs/config';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: { findOne: jest.Mock };

  beforeEach(() => {
    userRepository = { findOne: jest.fn() };
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('test_secret_key'),
    } as unknown as ConfigService;
    strategy = new JwtStrategy(configService, userRepository as any);
  });

  it('should return user payload when user is valid', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 1,
      email: 'test@test.com',
      isEmailVerified: true,
      status: UserStatus.ACTIVE,
      role: UserRole.USER,
    });

    const result = await strategy.validate({
      email: 'test@test.com',
      userId: 1,
      role: UserRole.USER,
      sessionKey: 'key',
    });
    expect(result).toEqual({ userId: 1, email: 'test@test.com', role: UserRole.USER });
  });

  it('should throw ForbiddenException when user not found', async () => {
    userRepository.findOne.mockResolvedValue(null);
    await expect(
      strategy.validate({
        email: 'test@test.com',
        userId: 999,
        role: UserRole.USER,
        sessionKey: 'key',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when email does not match', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 1,
      email: 'other@test.com',
      isEmailVerified: true,
      status: UserStatus.ACTIVE,
      role: UserRole.USER,
    });
    await expect(
      strategy.validate({
        email: 'test@test.com',
        userId: 1,
        role: UserRole.USER,
        sessionKey: 'key',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when email is not verified', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 1,
      email: 'test@test.com',
      isEmailVerified: false,
      status: UserStatus.ACTIVE,
      role: UserRole.USER,
    });
    await expect(
      strategy.validate({
        email: 'test@test.com',
        userId: 1,
        role: UserRole.USER,
        sessionKey: 'key',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user is inactive', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 1,
      email: 'test@test.com',
      isEmailVerified: true,
      status: UserStatus.INACTIVE,
      role: UserRole.USER,
    });
    await expect(
      strategy.validate({
        email: 'test@test.com',
        userId: 1,
        role: UserRole.USER,
        sessionKey: 'key',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
