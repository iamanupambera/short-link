import { Test, TestingModule } from '@nestjs/testing';
import { RedirectService } from './redirect.service';
import { LinksRepository } from '../links/repository/links.repository';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { QueueService } from '../redis/queue.service';
import { LinkStatus } from '../links/entities/link.entity';
import { compare } from 'bcrypt';
import { type Request } from 'express';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('RedirectService', () => {
  let service: RedirectService;
  let linksRepository: any;
  let redis: any;
  let queueService: any;

  beforeEach(async () => {
    linksRepository = {
      findLinkByCode: jest.fn(),
    };
    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    queueService = {
      push: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedirectService,
        { provide: LinksRepository, useValue: linksRepository },
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: QueueService, useValue: queueService },
      ],
    }).compile();

    service = module.get<RedirectService>(RedirectService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolveRedirect', () => {
    const mockReq = {
      headers: {
        'user-agent': 'Mozilla/5.0',
        referer: 'https://google.com',
      },
      socket: {
        remoteAddress: '127.0.0.1',
      },
    } as any as Request;

    it('should redirect successfully for a normal, active, un-expired cache-hit link', async () => {
      const cachedLink = {
        id: 1,
        shortCode: 'abc',
        originalUrl: 'https://example.com',
        status: LinkStatus.ACTIVE,
        expiresAt: null,
      };
      redis.get.mockResolvedValue(JSON.stringify(cachedLink));

      const result = await service.resolveRedirect('abc', undefined, mockReq);

      expect(result).toEqual({
        type: 'redirect',
        url: 'https://example.com',
      });
      expect(queueService.push).toHaveBeenCalled();
    });

    it('should return error if link is not found', async () => {
      redis.get.mockResolvedValue(null);
      linksRepository.findLinkByCode.mockResolvedValue(null);

      const result = await service.resolveRedirect('abc', undefined, mockReq);

      expect(result.type).toBe('error');
      expect(result.statusCode).toBe(404);
    });

    it('should return error if link is inactive', async () => {
      const cachedLink = {
        id: 1,
        shortCode: 'abc',
        originalUrl: 'https://example.com',
        status: LinkStatus.INACTIVE,
      };
      redis.get.mockResolvedValue(JSON.stringify(cachedLink));

      const result = await service.resolveRedirect('abc', undefined, mockReq);

      expect(result.type).toBe('error');
      expect(result.statusCode).toBe(403);
    });

    it('should return error if link is expired', async () => {
      const cachedLink = {
        id: 1,
        shortCode: 'abc',
        originalUrl: 'https://example.com',
        status: LinkStatus.ACTIVE,
        expiresAt: new Date(Date.now() - 10000).toISOString(),
      };
      redis.get.mockResolvedValue(JSON.stringify(cachedLink));

      const result = await service.resolveRedirect('abc', undefined, mockReq);

      expect(result.type).toBe('error');
      expect(result.statusCode).toBe(410);
    });

    it('should require password prompt if link is protected and no token is provided', async () => {
      const cachedLink = {
        id: 1,
        shortCode: 'abc',
        originalUrl: 'https://example.com',
        status: LinkStatus.ACTIVE,
        passwordHash: 'hashedpassword',
      };
      redis.get.mockResolvedValue(JSON.stringify(cachedLink));

      const result = await service.resolveRedirect('abc', undefined, mockReq);

      expect(result).toEqual({
        type: 'password_prompt',
        isRetry: false,
      });
    });

    it('should return retry password prompt if token is invalid or missing in Redis', async () => {
      const cachedLink = {
        id: 1,
        shortCode: 'abc',
        originalUrl: 'https://example.com',
        status: LinkStatus.ACTIVE,
        passwordHash: 'hashedpassword',
      };
      redis.get.mockImplementation((key: string) => {
        if (key === 'short:abc') return JSON.stringify(cachedLink);
        return null;
      });

      const result = await service.resolveRedirect('abc', 'invalidtoken', mockReq);

      expect(result).toEqual({
        type: 'password_prompt',
        isRetry: true,
      });
    });

    it('should redirect if valid token is provided in Redis', async () => {
      const cachedLink = {
        id: 1,
        shortCode: 'abc',
        originalUrl: 'https://example.com',
        status: LinkStatus.ACTIVE,
        passwordHash: 'hashedpassword',
      };
      redis.get.mockImplementation((key: string) => {
        if (key === 'short:abc') return JSON.stringify(cachedLink);
        if (key === 'unlock:abc:validtoken') return 'valid';
        return null;
      });

      const result = await service.resolveRedirect('abc', 'validtoken', mockReq);

      expect(result).toEqual({
        type: 'redirect',
        url: 'https://example.com',
      });
      expect(redis.del).toHaveBeenCalledWith('unlock:abc:validtoken');
    });
  });

  describe('unlockLink', () => {
    it('should return null if no password is provided', async () => {
      const result = await service.unlockLink('abc', undefined);
      expect(result).toBeNull();
    });

    it('should return null if password is incorrect', async () => {
      const cachedLink = {
        id: 1,
        shortCode: 'abc',
        originalUrl: 'https://example.com',
        status: LinkStatus.ACTIVE,
        passwordHash: 'hashedpassword',
      };
      redis.get.mockResolvedValue(JSON.stringify(cachedLink));
      (compare as jest.Mock).mockResolvedValue(false);

      const result = await service.unlockLink('abc', 'wrongpass');
      expect(result).toBeNull();
    });

    it('should return a token if password is correct', async () => {
      const cachedLink = {
        id: 1,
        shortCode: 'abc',
        originalUrl: 'https://example.com',
        status: LinkStatus.ACTIVE,
        passwordHash: 'hashedpassword',
      };
      redis.get.mockResolvedValue(JSON.stringify(cachedLink));
      (compare as jest.Mock).mockResolvedValue(true);

      const result = await service.unlockLink('abc', 'correctpass');
      expect(result).toBeDefined();
      expect(result?.token).toBeDefined();
      expect(redis.set).toHaveBeenCalled();
    });
  });
});
