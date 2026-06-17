import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole } from './entities/user.entity';
import { Response } from 'express';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  resendVerificationEmail: jest.fn(),
  verifyEmail: jest.fn(),
  getMe: jest.fn(),
  getRefreshToken: jest.fn(),
  updateUserDetails: jest.fn(),
  logout: jest.fn(),
  updateProfilePicture: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('register should delegate to authService', async () => {
    const dto = { name: 'Test', email: 'test@test.com', password: 'Password@123' };
    const expected = { statusCode: 201, response: {}, message: '' };
    mockAuthService.register.mockResolvedValue(expected);
    expect(await controller.register(dto)).toBe(expected);
  });

  it('login should delegate to authService', async () => {
    const dto = { email: 'test@test.com', password: 'Password@123' };
    const res = {} as Response;
    const expected = { statusCode: 200, response: {}, message: '' };
    mockAuthService.login.mockResolvedValue(expected);
    expect(await controller.login(dto, res)).toBe(expected);
  });

  it('resendVerificationEmail should delegate to authService', async () => {
    const dto = { email: 'test@test.com' };
    const expected = { statusCode: 200, response: {}, message: '' };
    mockAuthService.resendVerificationEmail.mockResolvedValue(expected);
    expect(await controller.resendVerificationEmail(dto)).toBe(expected);
  });

  it('verifyEmail should delegate to authService', async () => {
    const dto = { email: 'test@test.com', otp: '123456' };
    const res = {} as Response;
    const expected = { statusCode: 200, response: {}, message: '' };
    mockAuthService.verifyEmail.mockResolvedValue(expected);
    expect(await controller.verifyEmail(dto, res)).toBe(expected);
  });

  it('getMe should delegate to authService', async () => {
    const user = { userId: 1, email: 'test@test.com', role: UserRole.USER, sessionKey: 'k' };
    const expected = { statusCode: 200, response: {}, message: '' };
    mockAuthService.getMe.mockResolvedValue(expected);
    expect(await controller.getMe(user)).toBe(expected);
  });

  it('getRefreshToken should delegate to authService', async () => {
    const res = {} as Response;
    const expected = { statusCode: 200, response: {}, message: '' };
    mockAuthService.getRefreshToken.mockResolvedValue(expected);
    expect(await controller.getRefreshToken(res, 'refresh-token-value')).toBe(expected);
  });

  it('updateUserDetails should delegate to authService', async () => {
    const user = { userId: 1, email: 'test@test.com', role: UserRole.USER, sessionKey: 'k' };
    const dto = { name: 'Updated', location: '' };
    const expected = { statusCode: 200, response: {}, message: '' };
    mockAuthService.updateUserDetails.mockResolvedValue(expected);
    expect(await controller.updateUserDetails(user, dto)).toBe(expected);
  });

  it('logout should delegate to authService', async () => {
    const res = {} as Response;
    const expected = { statusCode: 200, response: {}, message: '' };
    mockAuthService.logout.mockResolvedValue(expected);
    expect(await controller.logout(res, 'refresh-token')).toBe(expected);
  });

  it('updateProfilePicture should delegate to authService', async () => {
    const user = { userId: 1, email: 'test@test.com', role: UserRole.USER, sessionKey: 'k' };
    const file = { originalname: 'photo.png' } as Express.Multer.File;
    const expected = { statusCode: 200, response: {}, message: '' };
    mockAuthService.updateProfilePicture.mockResolvedValue(expected);
    expect(await controller.updateProfilePicture(file, user)).toBe(expected);
  });

  it('forgotPassword should delegate to authService', async () => {
    const dto = { email: 'test@test.com' };
    const expected = { statusCode: 200, response: {}, message: '' };
    mockAuthService.forgotPassword.mockResolvedValue(expected);
    expect(await controller.forgotPassword(dto)).toBe(expected);
  });

  it('resetPassword should delegate to authService', async () => {
    const dto = { email: 'test@test.com', otp: '123456', password: 'NewPass@1' };
    const expected = { statusCode: 200, response: {}, message: '' };
    mockAuthService.resetPassword.mockResolvedValue(expected);
    expect(await controller.resetPassword(dto)).toBe(expected);
  });
});
