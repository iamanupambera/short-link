import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { REDIS_CLIENT } from '../redis/redis.constants';

describe('HealthController', () => {
  let controller: HealthController;
  let mockHealth: any;
  let mockDb: any;
  let mockRedis: any;

  beforeEach(async () => {
    mockHealth = {
      check: jest.fn().mockImplementation((indicators) => {
        return Promise.all(indicators.map((i) => i())).then((results) => {
          return { status: 'ok', details: results };
        });
      }),
    };
    mockDb = {
      pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
    };
    mockRedis = {
      ping: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealth },
        { provide: TypeOrmHealthIndicator, useValue: mockDb },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return up status when db and redis are up', async () => {
    mockRedis.ping.mockResolvedValue('PONG');
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(mockHealth.check).toHaveBeenCalled();
    expect(mockDb.pingCheck).toHaveBeenCalledWith('database', { timeout: 3000 });
    expect(mockRedis.ping).toHaveBeenCalled();
  });

  it('should return down status when redis is down (not PONG)', async () => {
    mockRedis.ping.mockResolvedValue('FAIL');
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.details[1]).toEqual({
      redis: { status: 'down', message: 'Ping response was not PONG' },
    });
  });

  it('should return down status when redis throws error', async () => {
    mockRedis.ping.mockRejectedValue(new Error('Redis Connection Error'));
    const result = await controller.check();
    expect(result.details[1]).toEqual({
      redis: { status: 'down', message: 'Redis Connection Error' },
    });
  });

  it('should handle non-Error catch in redis ping', async () => {
    mockRedis.ping.mockRejectedValue('Some string error');
    const result = await controller.check();
    expect(result.details[1]).toEqual({ redis: { status: 'down', message: 'Unknown error' } });
  });
});
