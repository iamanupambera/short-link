import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsWorker } from './analytics.worker';
import { ClicksRepository } from './repository/clicks.repository';
import { QueueService } from '../redis/queue.service';
import { ConfigService } from '@nestjs/config';

describe('AnalyticsWorker', () => {
  let worker: AnalyticsWorker;
  let mockClicksRepository: any;
  let mockQueueService: any;
  let mockConfigService: any;

  beforeEach(async () => {
    jest.useFakeTimers();

    mockClicksRepository = {
      create: jest.fn().mockImplementation((val) => val),
      save: jest.fn().mockResolvedValue([]),
    };

    mockQueueService = {
      popBatch: jest.fn(),
    };

    mockConfigService = {
      getOrThrow: jest.fn().mockImplementation((key) => {
        if (key === 'IP_SALT_SECRET') return 'my-salt-secret';
        throw new Error('Missing secret');
      }),
      get: jest.fn().mockImplementation((key) => {
        if (key === 'ANALYTICS_BATCH_SIZE') return '10';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsWorker,
        { provide: ClicksRepository, useValue: mockClicksRepository },
        { provide: QueueService, useValue: mockQueueService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    worker = module.get<AnalyticsWorker>(AnalyticsWorker);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Lifecycle', () => {
    it('should start background loop on bootstrap', () => {
      mockQueueService.popBatch.mockResolvedValue([]);

      worker.onApplicationBootstrap();

      expect(mockQueueService.popBatch).toHaveBeenCalledWith('analytics_clicks_queue', 10);
    });

    it('should stop background loop and clear timeout on shutdown', () => {
      mockQueueService.popBatch.mockResolvedValue([]);
      worker.onApplicationBootstrap();

      worker.onApplicationShutdown();

      // advancing timers should not trigger another popBatch because isRunning is false
      jest.advanceTimersByTime(1000);
      expect(mockQueueService.popBatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('processLoop', () => {
    it('should schedule next loop immediately (0ms) if items were processed', async () => {
      const mockEvent = {
        linkId: 1,
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        referrer: 'Direct',
        timestamp: new Date().toISOString(),
      };
      mockQueueService.popBatch.mockResolvedValue([mockEvent]);

      worker.onApplicationBootstrap();
      // Wait for multiple microtasks (popBatch, processClickEvents, save) to resolve
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockClicksRepository.save).toHaveBeenCalled();

      // Advance by 0ms to trigger next loop
      jest.advanceTimersByTime(0);
      expect(mockQueueService.popBatch).toHaveBeenCalledTimes(2);
    });

    it('should poll after 500ms if queue is empty', async () => {
      mockQueueService.popBatch.mockResolvedValue([]);

      worker.onApplicationBootstrap();
      await Promise.resolve();
      await Promise.resolve();

      // At 0ms, should not poll again
      jest.advanceTimersByTime(0);
      expect(mockQueueService.popBatch).toHaveBeenCalledTimes(1);

      // At 500ms, should poll again
      jest.advanceTimersByTime(500);
      expect(mockQueueService.popBatch).toHaveBeenCalledTimes(2);
    });

    it('should poll after 2000ms if error occurs', async () => {
      mockQueueService.popBatch.mockRejectedValue(new Error('Redis connection failure'));

      worker.onApplicationBootstrap();
      await Promise.resolve();
      await Promise.resolve();

      // At 500ms, should not poll
      jest.advanceTimersByTime(500);
      expect(mockQueueService.popBatch).toHaveBeenCalledTimes(1);

      // At 2000ms, should poll again
      jest.advanceTimersByTime(1500);
      expect(mockQueueService.popBatch).toHaveBeenCalledTimes(2);
    });
  });

  describe('buildClickEntity', () => {
    it('should map event details correctly with different user agents, IPs, and referrers', async () => {
      const mockEvents = [
        {
          linkId: 1,
          ip: '8.8.8.8',
          userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
          referrer: 'https://github.com/welcome',
          country: 'US',
          timestamp: '2026-06-15T12:00:00.000Z',
        },
        {
          linkId: 2,
          ip: '192.168.1.5',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          referrer: 'invalid-url-domain',
          timestamp: '2026-06-15T12:05:00.000Z',
        },
        {
          linkId: 3,
          ip: '::1',
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X)',
          referrer: '',
          timestamp: '2026-06-15T12:10:00.000Z',
        },
      ];

      mockQueueService.popBatch.mockResolvedValue(mockEvents);

      worker.onApplicationBootstrap();
      await Promise.resolve();

      expect(mockClicksRepository.create).toHaveBeenCalledTimes(3);

      // Check first item (iPhone Mobile, external IP with US country, Valid Referrer)
      expect(mockClicksRepository.create).toHaveBeenNthCalledWith(1, {
        linkId: 1,
        ipHash: expect.any(String),
        country: 'US',
        browser: 'Mobile Safari',
        device: 'mobile',
        referrer: 'github.com',
        createdAt: new Date('2026-06-15T12:00:00.000Z'),
      });

      // Check second item (Windows Desktop, local IP, Invalid Referrer)
      expect(mockClicksRepository.create).toHaveBeenNthCalledWith(2, {
        linkId: 2,
        ipHash: expect.any(String),
        country: 'Local',
        browser: expect.any(String), // Match any browser string parsed by UAParser
        device: 'desktop',
        referrer: 'Direct',
        createdAt: new Date('2026-06-15T12:05:00.000Z'),
      });

      // Check third item (iPad Tablet, local IPv6, no Referrer)
      expect(mockClicksRepository.create).toHaveBeenNthCalledWith(3, {
        linkId: 3,
        ipHash: expect.any(String),
        country: 'Local',
        browser: expect.any(String),
        device: 'tablet',
        referrer: 'Direct',
        createdAt: new Date('2026-06-15T12:10:00.000Z'),
      });
    });
  });
});
