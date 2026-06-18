import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthRepository } from './repository/auth.repository';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { UserRole, UserStatus } from './entities/user.entity';
import { Response } from 'express';

const mockAuthRepository = {
  findOne: jest.fn(),
  createUser: jest.fn(),
  update: jest.fn(),
  findById: jest.fn(),
  manager: { save: jest.fn() },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn(),
};

const configMap: Record<string, string> = {
  ACCESS_TOKEN_EXPIRY: '1h',
  REFRESH_TOKEN_EXPIRY: '30d',
  NODE_ENV: 'DEVELOPMENT',
  OTP_EXPIRY_SECONDS: '300',
};

const mockConfigService = {
  getOrThrow: jest.fn((key: string) => configMap[key] || key),
  get: jest.fn((key: string) => configMap[key] || undefined),
};

const mockRedis = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
};

const mockEmailService = {
  sendVerificationMessage: jest.fn().mockResolvedValue(true),
  sendResetPasswordOtp: jest.fn().mockResolvedValue(true),
};

const mockStorageService = {
  uploadFile: jest.fn().mockResolvedValue({ url: 'http://localhost/uploads/profile/test.png' }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: mockAuthRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'EMAIL_SERVICE', useValue: mockEmailService },
        { provide: 'STORAGE_SERVICE', useValue: mockStorageService },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user and send verification email', async () => {
      mockAuthRepository.findOne.mockResolvedValue(null);
      const savedUser = {
        id: 1,
        name: 'Test',
        email: 'test@test.com',
        role: UserRole.USER,
      };
      mockAuthRepository.createUser.mockResolvedValue(savedUser);

      const result = await service.register({
        name: 'Test',
        email: 'test@test.com',
        password: 'Password@123',
      });

      expect(result.statusCode).toBe(201);
      expect(result.response).toEqual(savedUser);
      expect(mockEmailService.sendVerificationMessage).toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      mockAuthRepository.findOne.mockResolvedValue({ id: 1 });
      await expect(
        service.register({ name: 'Test', email: 'test@test.com', password: 'Pass@123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const mockRes = {
      cookie: jest.fn(),
    } as unknown as Response;

    const mockUser = {
      id: 1,
      name: 'Test',
      email: 'test@test.com',
      isEmailVerified: true,
      status: UserStatus.ACTIVE,
      role: UserRole.USER,
      password: {
        validatePassword: jest.fn().mockResolvedValue(true),
      },
    };

    it('should login successfully and set cookie', async () => {
      mockAuthRepository.findOne.mockResolvedValue(mockUser);
      const result = await service.login(
        { email: 'test@test.com', password: 'Password@123' },
        mockRes,
      );

      expect(result.statusCode).toBe(201);
      expect(result.response).toHaveProperty('accessToken');
      expect(mockRes.cookie).toHaveBeenCalled();
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockAuthRepository.findOne.mockResolvedValue(null);
      await expect(
        service.login({ email: 'nope@test.com', password: 'Password@123' }, mockRes),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException when email not verified', async () => {
      mockAuthRepository.findOne.mockResolvedValue({ ...mockUser, isEmailVerified: false });
      await expect(
        service.login({ email: 'test@test.com', password: 'Password@123' }, mockRes),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when account is inactive', async () => {
      mockAuthRepository.findOne.mockResolvedValue({
        ...mockUser,
        status: UserStatus.INACTIVE,
      });
      await expect(
        service.login({ email: 'test@test.com', password: 'Password@123' }, mockRes),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      const userWithBadPw = {
        ...mockUser,
        password: { validatePassword: jest.fn().mockResolvedValue(false) },
      };
      mockAuthRepository.findOne.mockResolvedValue(userWithBadPw);
      await expect(
        service.login({ email: 'test@test.com', password: 'wrong' }, mockRes),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('resendVerificationEmail', () => {
    it('should return success even when user does not exist (email enumeration protection)', async () => {
      mockAuthRepository.findOne.mockResolvedValue(null);
      const result = await service.resendVerificationEmail({ email: 'nope@test.com' });
      expect(result.statusCode).toBe(200);
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('should send OTP when user exists', async () => {
      mockAuthRepository.findOne.mockResolvedValue({
        email: 'user@test.com',
        name: 'User',
      });
      const result = await service.resendVerificationEmail({ email: 'user@test.com' });
      expect(result.statusCode).toBe(200);
      expect(mockRedis.set).toHaveBeenCalled();
      expect(mockEmailService.sendVerificationMessage).toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    const mockRes = {
      cookie: jest.fn(),
    } as unknown as Response;

    const mockUser = {
      id: 1,
      name: 'Test',
      email: 'test@test.com',
      role: UserRole.USER,
      isEmailVerified: false,
    };

    it('should verify email, update user, generate tokens, create session, and set cookie successfully', async () => {
      mockRedis.get.mockResolvedValue('123456');
      mockAuthRepository.update.mockResolvedValue({ affected: 1 });
      mockAuthRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.verifyEmail({ email: 'test@test.com', otp: '123456' }, mockRes);

      expect(mockRedis.get).toHaveBeenCalledWith('otp:test@test.com');
      expect(mockRedis.del).toHaveBeenCalledWith('otp:test@test.com');
      expect(mockAuthRepository.update).toHaveBeenCalledWith(
        { email: 'test@test.com' },
        { isEmailVerified: true },
      );
      expect(mockAuthRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
      });
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^session:1_/),
        'active',
        'EX',
        expect.any(Number),
      );
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'refresh-token',
        'mock.jwt.token',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
        }),
      );

      expect(result.statusCode).toBe(200);
      expect(result.response).toEqual({
        accessToken: 'mock.jwt.token',
        user: mockUser,
      });
    });

    it('should throw BadRequestException when OTP is invalid', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(
        service.verifyEmail({ email: 'test@test.com', otp: 'wrong' }, mockRes),
      ).rejects.toThrow(BadRequestException);
      expect(mockAuthRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found after OTP verification', async () => {
      mockRedis.get.mockResolvedValue('123456');
      mockAuthRepository.findOne.mockResolvedValue(null);

      await expect(
        service.verifyEmail({ email: 'test@test.com', otp: '123456' }, mockRes),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMe', () => {
    it('should return user data', async () => {
      const user = { id: 1, name: 'Test' };
      mockAuthRepository.findOne.mockResolvedValue(user);
      const result = await service.getMe({
        userId: 1,
        email: 'test@test.com',
        role: UserRole.USER,
        sessionKey: 'key',
      });
      expect(result.statusCode).toBe(200);
      expect(result.response).toEqual(user);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockAuthRepository.findOne.mockResolvedValue(null);
      await expect(
        service.getMe({
          userId: 999,
          email: 'test@test.com',
          role: UserRole.USER,
          sessionKey: 'key',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRefreshToken', () => {
    const mockRes = {
      cookie: jest.fn(),
    } as unknown as Response;

    it('should refresh tokens and rotate session', async () => {
      const payload = {
        email: 'test@test.com',
        userId: 1,
        role: UserRole.USER,
        sessionKey: 'old_session',
      };
      mockJwtService.verify.mockReturnValue(payload);
      mockRedis.get.mockResolvedValue('active');
      mockAuthRepository.findOne.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        role: UserRole.USER,
      });

      const result = await service.getRefreshToken(mockRes, 'mock.refresh.token');
      expect(result.statusCode).toBe(201);
      expect(mockRedis.del).toHaveBeenCalledWith('session:old_session');
      expect(mockRedis.set).toHaveBeenCalled();
      expect(mockRes.cookie).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });
      await expect(service.getRefreshToken(mockRes, 'bad.token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when sessionKey is missing', async () => {
      mockJwtService.verify.mockReturnValue({ email: 'test@test.com', userId: 1 });
      await expect(service.getRefreshToken(mockRes, 'token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when session does not exist in Redis', async () => {
      mockJwtService.verify.mockReturnValue({
        email: 'test@test.com',
        userId: 1,
        sessionKey: 'expired',
      });
      mockRedis.get.mockResolvedValue(null);
      await expect(service.getRefreshToken(mockRes, 'token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw NotFoundException when user not found after session validation', async () => {
      mockJwtService.verify.mockReturnValue({
        email: 'test@test.com',
        userId: 1,
        sessionKey: 'valid',
      });
      mockRedis.get.mockResolvedValue('active');
      mockAuthRepository.findOne.mockResolvedValue(null);
      await expect(service.getRefreshToken(mockRes, 'token')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUserDetails', () => {
    it('should update user details', async () => {
      mockAuthRepository.update.mockResolvedValue({ affected: 1 });
      mockAuthRepository.findOne.mockResolvedValue({ id: 1, name: 'New Name' });
      const result = await service.updateUserDetails(
        { userId: 1, email: 'test@test.com', role: UserRole.USER, sessionKey: 'key' },
        { name: 'New Name', location: '' },
      );
      expect(result.statusCode).toBe(201);
      expect(result.response).toEqual({ id: 1, name: 'New Name' });
    });
  });

  describe('logout', () => {
    const mockRes = {
      clearCookie: jest.fn(),
    } as unknown as Response;

    it('should clear cookie and delete session from Redis', async () => {
      mockJwtService.verify.mockReturnValue({ sessionKey: 'sess' });
      const result = await service.logout(mockRes, 'mock.token');
      expect(mockRedis.del).toHaveBeenCalledWith('session:sess');
      expect(mockRes.clearCookie).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
    });

    it('should clear cookie even without token', async () => {
      const result = await service.logout(mockRes);
      expect(mockRes.clearCookie).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
    });

    it('should handle verify errors gracefully during logout', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('bad');
      });
      const result = await service.logout(mockRes, 'bad.token');
      expect(result.statusCode).toBe(200);
    });
  });

  describe('updateProfilePicture', () => {
    const mockUser = {
      userId: 1,
      email: 'test@test.com',
      role: UserRole.USER,
      sessionKey: 'key',
    };

    it('should upload and update profile picture', async () => {
      const file = {
        originalname: 'photo.png',
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      } as Express.Multer.File;
      mockAuthRepository.findById.mockResolvedValue({
        id: 1,
        profilePicture: null,
      });
      mockAuthRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateProfilePicture(file, mockUser);
      expect(result.statusCode).toBe(200);
      expect(mockStorageService.uploadFile).toHaveBeenCalled();
    });

    it('should throw BadRequestException when no file is uploaded', async () => {
      await expect(
        service.updateProfilePicture(null as unknown as Express.Multer.File, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user not found', async () => {
      const file = {
        originalname: 'photo.png',
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      } as Express.Multer.File;
      mockAuthRepository.findById.mockResolvedValue(null);
      await expect(service.updateProfilePicture(file, mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('forgotPassword', () => {
    it('should return success even when user does not exist (email enumeration protection)', async () => {
      mockAuthRepository.findOne.mockResolvedValue(null);
      const result = await service.forgotPassword({ email: 'nope@test.com' });
      expect(result.statusCode).toBe(200);
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('should send reset OTP when user exists', async () => {
      mockAuthRepository.findOne.mockResolvedValue({
        email: 'user@test.com',
        name: 'User',
      });
      const result = await service.forgotPassword({ email: 'user@test.com' });
      expect(result.statusCode).toBe(200);
      expect(mockRedis.set).toHaveBeenCalled();
      expect(mockEmailService.sendResetPasswordOtp).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password when OTP is valid', async () => {
      mockRedis.get.mockResolvedValue('123456');
      mockAuthRepository.findOne.mockResolvedValue({
        email: 'test@test.com',
        password: { password: 'old' },
      });
      mockAuthRepository.manager.save.mockResolvedValue({});

      const result = await service.resetPassword({
        email: 'test@test.com',
        otp: '123456',
        password: 'NewPassword@1',
      });
      expect(result.statusCode).toBe(200);
    });

    it('should throw BadRequestException when OTP is invalid', async () => {
      mockRedis.get.mockResolvedValue(null);
      await expect(
        service.resetPassword({
          email: 'test@test.com',
          otp: 'wrong',
          password: 'NewPassword@1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user not found after OTP verification', async () => {
      mockRedis.get.mockResolvedValue('123456');
      mockAuthRepository.findOne.mockResolvedValue(null);
      await expect(
        service.resetPassword({
          email: 'test@test.com',
          otp: '123456',
          password: 'NewPassword@1',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
