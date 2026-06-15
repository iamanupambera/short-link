import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { LinksService } from './links.service';
import { LinksRepository } from './repository/links.repository';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { ConfigService } from '@nestjs/config';
import { LinkStatus } from './entities/link.entity';

const mockLinksRepository = {
  findLinkByCode: jest.fn(),
  findLinkById: jest.fn(),
  findAndCountAll: jest.fn(),
  create: jest.fn((data: any) => data),
  save: jest.fn((data: any) => ({ ...data, id: 1 })),
  remove: jest.fn(),
};

const mockRedis = {
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn().mockResolvedValue(0),
  get: jest.fn(),
};

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('10'),
  get: jest.fn(),
};

describe('LinksService', () => {
  let service: LinksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinksService,
        { provide: LinksRepository, useValue: mockLinksRepository },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<LinksService>(LinksService);
    jest.clearAllMocks();
    mockRedis.exists.mockResolvedValue(0);
    mockLinksRepository.findLinkByCode.mockResolvedValue(null);
    mockLinksRepository.save.mockImplementation((data: any) => ({ ...data, id: 1 }));
    mockLinksRepository.create.mockImplementation((data: any) => data);
  });

  describe('createLink', () => {
    it('should create a link with auto-generated short code', async () => {
      const result = await service.createLink({ originalUrl: 'https://example.com' }, 1);
      expect(result).toHaveProperty('id');
      expect(result.originalUrl).toBe('https://example.com');
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should create a link with custom alias', async () => {
      const result = await service.createLink(
        { originalUrl: 'https://example.com', customAlias: 'my-alias' },
        1,
      );
      expect(result.shortCode).toBe('my-alias');
    });

    it('should throw ConflictException for invalid custom alias characters', async () => {
      await expect(
        service.createLink({ originalUrl: 'https://example.com', customAlias: 'bad alias!' }, 1),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when custom alias is already in use', async () => {
      mockLinksRepository.findLinkByCode.mockResolvedValue({ id: 2 });
      await expect(
        service.createLink({ originalUrl: 'https://example.com', customAlias: 'taken' }, 1),
      ).rejects.toThrow(ConflictException);
    });

    it('should hash password when provided', async () => {
      const result = await service.createLink(
        { originalUrl: 'https://example.com', password: 'secret123' },
        1,
      );
      expect(result.passwordHash).toBeTruthy();
    });

    it('should set expiresAt when provided', async () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      const result = await service.createLink(
        { originalUrl: 'https://example.com', expiresAt: future },
        1,
      );
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should throw BadRequestException for invalid URL', async () => {
      await expect(service.createLink({ originalUrl: 'not-a-url' }, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for non-http URL', async () => {
      await expect(
        service.createLink({ originalUrl: 'ftp://example.com/file' }, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for localhost URL', async () => {
      await expect(service.createLink({ originalUrl: 'http://localhost:3000' }, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for private IP URL', async () => {
      await expect(
        service.createLink({ originalUrl: 'http://192.168.1.1/admin' }, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for 10.x.x.x URLs', async () => {
      await expect(service.createLink({ originalUrl: 'http://10.0.0.1/admin' }, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for 127.0.0.1 URL', async () => {
      await expect(service.createLink({ originalUrl: 'http://127.0.0.1/' }, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for 172.16-31.x.x URL', async () => {
      await expect(service.createLink({ originalUrl: 'http://172.16.0.1/' }, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should not block 172.15.x.x or 172.32.x.x (not in private range)', async () => {
      await expect(
        service.createLink({ originalUrl: 'http://172.15.0.1/' }, 1),
      ).resolves.toBeDefined();
    });

    it('should handle collision retry on save', async () => {
      let callCount = 0;
      mockLinksRepository.save.mockImplementation((data: any) => {
        callCount++;
        if (callCount === 1) {
          throw Object.assign(new Error('Duplicate entry'), {
            code: 'ER_DUP_ENTRY',
            errno: 1062,
          });
        }
        return { ...data, id: 1 };
      });

      const result = await service.createLink({ originalUrl: 'https://example.com' }, 1);
      expect(result).toHaveProperty('id');
    });

    it('should throw ConflictException when all retries fail', async () => {
      mockLinksRepository.save.mockImplementation(() => {
        throw Object.assign(new Error('Duplicate entry'), {
          code: 'ER_DUP_ENTRY',
          errno: 1062,
        });
      });

      await expect(service.createLink({ originalUrl: 'https://example.com' }, 1)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getLinks', () => {
    it('should return paginated links', async () => {
      const links = [{ id: 1 }, { id: 2 }];
      mockLinksRepository.findAndCountAll.mockResolvedValue([links, 2]);
      const result = await service.getLinks(1, 1, 10);
      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });
  });

  describe('getLinkById', () => {
    it('should return link when found', async () => {
      const link = { id: 1, shortCode: 'abc' };
      mockLinksRepository.findLinkById.mockResolvedValue(link);
      const result = await service.getLinkById(1, 1);
      expect(result).toEqual(link);
    });

    it('should throw NotFoundException when not found', async () => {
      mockLinksRepository.findLinkById.mockResolvedValue(null);
      await expect(service.getLinkById(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateLink', () => {
    const existingLink = {
      id: 1,
      shortCode: 'abc123',
      customAlias: null,
      originalUrl: 'https://old.com',
      passwordHash: null,
      expiresAt: null,
      status: LinkStatus.ACTIVE,
      userId: 1,
    };

    beforeEach(() => {
      mockLinksRepository.findLinkById.mockResolvedValue({ ...existingLink });
      mockLinksRepository.save.mockImplementation((data: any) => data);
    });

    it('should update originalUrl', async () => {
      const result = await service.updateLink(1, { originalUrl: 'https://new.com' }, 1);
      expect(result.originalUrl).toBe('https://new.com');
    });

    it('should update customAlias', async () => {
      mockLinksRepository.findLinkByCode.mockResolvedValue(null);
      const result = await service.updateLink(1, { customAlias: 'new-alias' }, 1);
      expect(result.customAlias).toBe('new-alias');
      expect(result.shortCode).toBe('new-alias');
    });

    it('should throw ConflictException when alias taken by another link', async () => {
      mockLinksRepository.findLinkByCode.mockResolvedValue({ id: 2 });
      await expect(service.updateLink(1, { customAlias: 'taken' }, 1)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow setting same alias on same link', async () => {
      mockLinksRepository.findLinkByCode.mockResolvedValue({ id: 1 });
      const result = await service.updateLink(1, { customAlias: 'same' }, 1);
      expect(result.customAlias).toBe('same');
    });

    it('should clear custom alias and generate new code', async () => {
      mockLinksRepository.findLinkById.mockResolvedValue({
        ...existingLink,
        customAlias: 'old-alias',
      });
      const result = await service.updateLink(1, { customAlias: '' }, 1);
      expect(result.customAlias).toBeNull();
    });

    it('should update password', async () => {
      const result = await service.updateLink(1, { password: 'newpass' }, 1);
      expect(result.passwordHash).toBeTruthy();
    });

    it('should clear password', async () => {
      const result = await service.updateLink(1, { password: '' }, 1);
      expect(result.passwordHash).toBeNull();
    });

    it('should update expiresAt', async () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      const result = await service.updateLink(1, { expiresAt: future }, 1);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should clear expiresAt', async () => {
      const result = await service.updateLink(1, { expiresAt: '' }, 1);
      expect(result.expiresAt).toBeNull();
    });

    it('should update status', async () => {
      const result = await service.updateLink(1, { status: LinkStatus.INACTIVE }, 1);
      expect(result.status).toBe(LinkStatus.INACTIVE);
    });

    it('should evict old cache and set new cache', async () => {
      await service.updateLink(1, { originalUrl: 'https://new.com' }, 1);
      expect(mockRedis.del).toHaveBeenCalledWith('short:abc123');
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate key error during save', async () => {
      mockLinksRepository.save.mockImplementation(() => {
        throw Object.assign(new Error('Duplicate entry'), {
          code: 'ER_DUP_ENTRY',
          errno: 1062,
        });
      });
      await expect(service.updateLink(1, { originalUrl: 'https://new.com' }, 1)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should re-throw non-duplicate errors during save', async () => {
      mockLinksRepository.save.mockImplementation(() => {
        throw new Error('DB connection error');
      });
      await expect(service.updateLink(1, { originalUrl: 'https://new.com' }, 1)).rejects.toThrow(
        'DB connection error',
      );
    });
  });

  describe('deleteLink', () => {
    it('should delete link and evict cache', async () => {
      mockLinksRepository.findLinkById.mockResolvedValue({
        id: 1,
        shortCode: 'abc123',
      });
      await service.deleteLink(1, 1);
      expect(mockRedis.del).toHaveBeenCalledWith('short:abc123');
      expect(mockLinksRepository.remove).toHaveBeenCalled();
    });
  });

  describe('cacheLink', () => {
    it('should cache link in Redis with 24h TTL', async () => {
      await service.cacheLink({
        id: 1,
        shortCode: 'abc',
        originalUrl: 'https://example.com',
        customAlias: null,
        passwordHash: null,
        expiresAt: null,
        status: LinkStatus.ACTIVE,
      } as any);
      expect(mockRedis.set).toHaveBeenCalledWith('short:abc', expect.any(String), 'EX', 86400);
    });

    it('should serialize expiresAt as ISO string', async () => {
      const date = new Date('2025-12-31T00:00:00Z');
      await service.cacheLink({
        id: 1,
        shortCode: 'abc',
        originalUrl: 'https://example.com',
        customAlias: null,
        passwordHash: null,
        expiresAt: date,
        status: LinkStatus.ACTIVE,
      } as any);
      const setCall = mockRedis.set.mock.calls[0];
      const parsed = JSON.parse(setCall[1]);
      expect(parsed.expiresAt).toBe('2025-12-31T00:00:00.000Z');
    });
  });
});
