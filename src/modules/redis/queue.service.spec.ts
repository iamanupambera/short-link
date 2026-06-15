import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service';
import { REDIS_CLIENT } from './redis.constants';

describe('QueueService', () => {
  let service: QueueService;
  let mockRedis: any;
  let mockMulti: any;

  beforeEach(async () => {
    mockMulti = {
      lrange: jest.fn().mockReturnThis(),
      ltrim: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    mockRedis = {
      rpush: jest.fn(),
      lpop: jest.fn(),
      multi: jest.fn().mockReturnValue(mockMulti),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [QueueService, { provide: REDIS_CLIENT, useValue: mockRedis }],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  describe('push', () => {
    it('should serialize data and push to redis', async () => {
      const data = { test: 'value' };
      await service.push('my-queue', data);
      expect(mockRedis.rpush).toHaveBeenCalledWith('my-queue', JSON.stringify(data));
    });
  });

  describe('pop', () => {
    it('should return null if queue is empty', async () => {
      mockRedis.lpop.mockResolvedValue(null);
      const result = await service.pop('my-queue');
      expect(result).toBeNull();
      expect(mockRedis.lpop).toHaveBeenCalledWith('my-queue');
    });

    it('should parse and return JSON if value is valid JSON', async () => {
      mockRedis.lpop.mockResolvedValue(JSON.stringify({ user: 'Alice' }));
      const result = await service.pop('my-queue');
      expect(result).toEqual({ user: 'Alice' });
    });

    it('should return raw value if value is not valid JSON', async () => {
      mockRedis.lpop.mockResolvedValue('raw-non-json-string');
      const result = await service.pop('my-queue');
      expect(result).toBe('raw-non-json-string');
    });
  });

  describe('popBatch', () => {
    it('should return empty array if count <= 0', async () => {
      const result = await service.popBatch('my-queue', 0);
      expect(result).toEqual([]);
      expect(mockRedis.multi).not.toHaveBeenCalled();
    });

    it('should return empty array if redis multi exec returns no results', async () => {
      mockMulti.exec.mockResolvedValue(null);
      const result = await service.popBatch('my-queue', 5);
      expect(result).toEqual([]);
      expect(mockRedis.multi).toHaveBeenCalled();
    });

    it('should parse batch items and fallback to raw values on JSON parse failure', async () => {
      mockMulti.exec.mockResolvedValue([
        [null, [JSON.stringify({ id: 1 }), 'invalid-json', JSON.stringify({ id: 2 })]],
      ]);

      const result = await service.popBatch<any>('my-queue', 3);

      expect(mockMulti.lrange).toHaveBeenCalledWith('my-queue', 0, 2);
      expect(mockMulti.ltrim).toHaveBeenCalledWith('my-queue', 3, -1);
      expect(result).toEqual([{ id: 1 }, 'invalid-json', { id: 2 }]);
    });
  });
});
