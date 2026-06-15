import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AuthRepository } from './repository/auth.repository';
import { OtpService } from './otp.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from '../redis/redis.constants';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: {
            findOne: jest.fn(),
            createUser: jest.fn(),
            update: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: OtpService,
          useValue: {
            createOtp: jest.fn(),
            verifyOtp: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn(),
          },
        },
        {
          provide: 'EMAIL_SERVICE',
          useValue: {
            sendVerificationMessage: jest.fn(),
            sendResetPasswordOtp: jest.fn(),
          },
        },
        {
          provide: 'STORAGE_SERVICE',
          useValue: {
            uploadFile: jest.fn(),
          },
        },
        {
          provide: REDIS_CLIENT,
          useValue: {
            set: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
            exists: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
