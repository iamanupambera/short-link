import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let mockAnalyticsService: any;

  beforeEach(async () => {
    mockAnalyticsService = {
      getDashboardAnalytics: jest.fn(),
      getLinkAnalytics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [{ provide: AnalyticsService, useValue: mockAnalyticsService }],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    jest.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('should query getDashboardAnalytics and return standard ApiResponse structure', async () => {
      const mockData = { totalLinks: 3 };
      mockAnalyticsService.getDashboardAnalytics.mockResolvedValue(mockData);

      const result = await controller.getDashboard({ userId: 100 } as any);

      expect(mockAnalyticsService.getDashboardAnalytics).toHaveBeenCalledWith(100);
      expect(result).toEqual({
        statusCode: 200,
        response: mockData,
        message: 'Dashboard analytics retrieved successfully',
      });
    });
  });

  describe('getLinkStats', () => {
    it('should query getLinkAnalytics and return standard ApiResponse structure', async () => {
      const mockData = { totalClicks: 15 };
      mockAnalyticsService.getLinkAnalytics.mockResolvedValue(mockData);

      const result = await controller.getLinkStats(1, { userId: 100 } as any);

      expect(mockAnalyticsService.getLinkAnalytics).toHaveBeenCalledWith(1, 100);
      expect(result).toEqual({
        statusCode: 200,
        response: mockData,
        message: 'Link analytics retrieved successfully',
      });
    });
  });
});
