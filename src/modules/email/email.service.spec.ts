import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import renderEmail from './renderEmail';

jest.mock('./renderEmail', () => jest.fn().mockResolvedValue('<p>Mock Email Html</p>'));

describe('EmailService', () => {
  let service: EmailService;
  let mockMailerService: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockMailerService = {
      sendMail: jest.fn(),
    };
    mockConfigService = {
      getOrThrow: jest.fn().mockImplementation((key: string) => {
        if (key === 'CLIENT_URL') return 'http://client.com';
        if (key === 'API_URL') return 'http://api.com';
        throw new Error(`Unexpected config key: ${key}`);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: MailerService, useValue: mockMailerService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    jest.clearAllMocks();
  });

  describe('sendVerificationMessage', () => {
    it('should return true and send mail successfully', async () => {
      mockMailerService.sendMail.mockResolvedValue(undefined);

      const result = await service.sendVerificationMessage({
        receiverId: 'user@test.com',
        otp: '123456',
        name: 'John',
      });

      expect(renderEmail).toHaveBeenCalledWith('VerifyEmail', {
        otp: '123456',
        clientUrl: 'http://client.com',
        email: 'user@test.com',
        apiUrl: 'http://api.com',
        name: 'John',
      });
      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: 'user@test.com',
        subject: 'Verify Your Email',
        html: '<p>Mock Email Html</p>',
      });
      expect(result).toBe(true);
    });

    it('should log error and return false if mailer throws error', async () => {
      mockMailerService.sendMail.mockRejectedValue(new Error('SMTP connection error'));

      const result = await service.sendVerificationMessage({
        receiverId: 'user@test.com',
        otp: '123456',
        name: 'John',
      });

      expect(result).toBe(false);
    });
  });

  describe('sendResetPasswordOtp', () => {
    it('should return true and send mail successfully', async () => {
      mockMailerService.sendMail.mockResolvedValue(undefined);

      const result = await service.sendResetPasswordOtp({
        receiverId: 'user@test.com',
        otp: '654321',
        name: 'John',
      });

      expect(renderEmail).toHaveBeenCalledWith('ResetPasswordOtp', {
        otp: '654321',
        apiUrl: 'http://api.com',
        name: 'John',
      });
      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: 'user@test.com',
        subject: 'Password reset otp received',
        html: '<p>Mock Email Html</p>',
      });
      expect(result).toBe(true);
    });

    it('should log error and return false if mailer throws error', async () => {
      mockMailerService.sendMail.mockRejectedValue(new Error('SMTP error'));

      const result = await service.sendResetPasswordOtp({
        receiverId: 'user@test.com',
        otp: '654321',
        name: 'John',
      });

      expect(result).toBe(false);
    });
  });

  describe('sendWelcomeMessage', () => {
    it('should return true and send mail successfully', async () => {
      mockMailerService.sendMail.mockResolvedValue(undefined);

      const result = await service.sendWelcomeMessage({
        receiverId: 'user@test.com',
        password: 'password123',
        role: 'USER',
        name: 'John',
      });

      expect(renderEmail).toHaveBeenCalledWith('WelcomeMail', {
        password: 'password123',
        role: 'USER',
        apiUrl: 'http://api.com',
        clientUrl: 'http://client.com',
        name: 'John',
      });
      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: 'user@test.com',
        subject: 'Welcome Email',
        html: '<p>Mock Email Html</p>',
      });
      expect(result).toBe(true);
    });

    it('should log error and return false if mailer throws error', async () => {
      mockMailerService.sendMail.mockRejectedValue(new Error('SMTP error'));

      const result = await service.sendWelcomeMessage({
        receiverId: 'user@test.com',
        password: 'password123',
        role: 'USER',
        name: 'John',
      });

      expect(result).toBe(false);
    });
  });
});
