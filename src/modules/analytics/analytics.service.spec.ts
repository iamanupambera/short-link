import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { ClicksRepository } from './repository/clicks.repository';
import { LinksRepository } from '../links/repository/links.repository';
import { NotFoundException } from '@nestjs/common';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockClicksRepository: any;
  let mockLinksRepository: any;

  beforeEach(async () => {
    mockClicksRepository = {
      countClicks: jest.fn(),
      countUniqueVisitors: jest.fn(),
      getGroupedStats: jest.fn(),
      countClicksForUserLinks: jest.fn(),
      countUniqueVisitorsForUserLinks: jest.fn(),
      getClicksOverTimeForUserLinks: jest.fn(),
      getTopLinksForUser: jest.fn(),
    };
    mockLinksRepository = {
      findLinkById: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: ClicksRepository, useValue: mockClicksRepository },
        { provide: LinksRepository, useValue: mockLinksRepository },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('getLinkAnalytics', () => {
    it('should throw NotFoundException if link is not found or unauthorized', async () => {
      mockLinksRepository.findLinkById.mockResolvedValue(null);
      await expect(service.getLinkAnalytics(1, 100)).rejects.toThrow(NotFoundException);
      expect(mockLinksRepository.findLinkById).toHaveBeenCalledWith(1, 100);
    });

    it('should return complete link analytics when link is found', async () => {
      const mockLink = {
        id: 1,
        shortCode: 'abc',
        originalUrl: 'http://orig.com',
        customAlias: 'alias',
        createdAt: new Date(),
      };
      mockLinksRepository.findLinkById.mockResolvedValue(mockLink);
      mockClicksRepository.countClicks.mockResolvedValue(10);
      mockClicksRepository.countUniqueVisitors.mockResolvedValue(5);
      mockClicksRepository.getGroupedStats.mockResolvedValue([]);

      const result = await service.getLinkAnalytics(1, 100);

      expect(mockLinksRepository.findLinkById).toHaveBeenCalledWith(1, 100);
      expect(mockClicksRepository.countClicks).toHaveBeenCalledWith(1);
      expect(mockClicksRepository.countUniqueVisitors).toHaveBeenCalledWith(1);
      expect(mockClicksRepository.getGroupedStats).toHaveBeenCalledTimes(4);
      expect(result).toEqual({
        link: {
          id: mockLink.id,
          shortCode: mockLink.shortCode,
          originalUrl: mockLink.originalUrl,
          customAlias: mockLink.customAlias,
          createdAt: mockLink.createdAt,
        },
        totalClicks: 10,
        uniqueVisitors: 5,
        devices: [],
        browsers: [],
        countries: [],
        referrers: [],
      });
    });
  });

  describe('getDashboardAnalytics', () => {
    it('should return empty stats if totalLinks is 0', async () => {
      mockLinksRepository.count.mockResolvedValue(0);

      const result = await service.getDashboardAnalytics(100);

      expect(mockLinksRepository.count).toHaveBeenCalledWith({ where: { userId: 100 } });
      expect(result).toEqual({
        totalLinks: 0,
        totalClicks: 0,
        uniqueVisitors: 0,
        clicksOverTime: [],
        topLinks: [],
      });
    });

    it('should return full aggregated statistics if user has links', async () => {
      mockLinksRepository.count.mockResolvedValue(5);
      mockClicksRepository.countClicksForUserLinks.mockResolvedValue(50);
      mockClicksRepository.countUniqueVisitorsForUserLinks.mockResolvedValue(30);
      mockClicksRepository.getClicksOverTimeForUserLinks.mockResolvedValue([]);
      mockClicksRepository.getTopLinksForUser.mockResolvedValue([]);

      const result = await service.getDashboardAnalytics(100);

      expect(mockLinksRepository.count).toHaveBeenCalledWith({ where: { userId: 100 } });
      expect(mockClicksRepository.countClicksForUserLinks).toHaveBeenCalledWith(100);
      expect(mockClicksRepository.countUniqueVisitorsForUserLinks).toHaveBeenCalledWith(100);
      expect(mockClicksRepository.getClicksOverTimeForUserLinks).toHaveBeenCalledWith(
        100,
        expect.any(Date),
      );
      expect(mockClicksRepository.getTopLinksForUser).toHaveBeenCalledWith(100, 5);
      expect(result).toEqual({
        totalLinks: 5,
        totalClicks: 50,
        uniqueVisitors: 30,
        clicksOverTime: [],
        topLinks: [],
      });
    });
  });
});
