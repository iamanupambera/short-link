import { ClicksRepository } from './clicks.repository';
import { DataSource } from 'typeorm';

describe('ClicksRepository', () => {
  let repository: ClicksRepository;
  let mockDataSource: any;
  let mockEntityManager: any;
  let mockQueryBuilder: any;

  beforeEach(() => {
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn(),
    };

    mockEntityManager = {
      connection: {
        options: { type: 'mysql' },
        relationMetadata: [],
      },
    };

    mockDataSource = {
      createEntityManager: jest.fn().mockReturnValue(mockEntityManager),
    };

    repository = new ClicksRepository(mockDataSource as DataSource);
    jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
  });

  describe('countClicks', () => {
    it('should return click count with optional filters', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(42);

      const filters = [{ clause: 'click.device = :device', param: { device: 'mobile' } }];
      const result = await repository.countClicks(1, filters);

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('click');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('click.linkId = :linkId', { linkId: 1 });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('click.device = :device', {
        device: 'mobile',
      });
      expect(result).toBe(42);
    });
  });

  describe('countUniqueVisitors', () => {
    it('should return unique visitors count', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({ count: '5' });

      const result = await repository.countUniqueVisitors(1);

      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        'COUNT(DISTINCT(click.ipHash))',
        'count',
      );
      expect(result).toBe(5);
    });

    it('should return 0 if no count is returned', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue(null);
      const result = await repository.countUniqueVisitors(1);
      expect(result).toBe(0);
    });
  });

  describe('countClicksForLinkIds', () => {
    it('should return 0 if linkIds is empty', async () => {
      const result = await repository.countClicksForLinkIds([]);
      expect(result).toBe(0);
      expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should return count for given linkIds', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(10);
      const result = await repository.countClicksForLinkIds([1, 2]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('click.linkId IN (:...linkIds)', {
        linkIds: [1, 2],
      });
      expect(result).toBe(10);
    });
  });

  describe('countClicksForUserLinks', () => {
    it("should return total clicks for a user's links", async () => {
      mockQueryBuilder.getCount.mockResolvedValue(15);
      const result = await repository.countClicksForUserLinks(100);
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith('click.link', 'link');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('link.userId = :userId', { userId: 100 });
      expect(result).toBe(15);
    });
  });

  describe('countUniqueVisitorsForLinkIds', () => {
    it('should return 0 if empty', async () => {
      const result = await repository.countUniqueVisitorsForLinkIds([]);
      expect(result).toBe(0);
    });

    it('should return count for given linkIds', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({ count: '3' });
      const result = await repository.countUniqueVisitorsForLinkIds([1, 2]);
      expect(result).toBe(3);
    });
  });

  describe('countUniqueVisitorsForUserLinks', () => {
    it('should return unique visitors for user links', async () => {
      mockQueryBuilder.getRawOne.mockResolvedValue({ count: '7' });
      const result = await repository.countUniqueVisitorsForUserLinks(100);
      expect(result).toBe(7);
    });
  });

  describe('getClicksOverTime', () => {
    it('should return empty array if linkIds is empty', async () => {
      const result = await repository.getClicksOverTime([], new Date());
      expect(result).toEqual([]);
    });

    it('should return mapped clicks over time', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([{ date: '2026-06-15', count: '10' }]);
      const date = new Date();
      const result = await repository.getClicksOverTime([1], date);
      expect(result).toEqual([{ date: '2026-06-15', count: 10 }]);
    });
  });

  describe('getClicksOverTimeForUserLinks', () => {
    it('should return clicks over time for user links', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([{ date: '2026-06-15', count: '12' }]);
      const result = await repository.getClicksOverTimeForUserLinks(100, new Date());
      expect(result).toEqual([{ date: '2026-06-15', count: 12 }]);
    });
  });

  describe('getTopLinks', () => {
    it('should return empty if linkIds is empty', async () => {
      const result = await repository.getTopLinks([]);
      expect(result).toEqual([]);
    });

    it('should return top links list', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([{ linkId: '1', count: '15' }]);
      const result = await repository.getTopLinks([1, 2], 3);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(3);
      expect(result).toEqual([{ linkId: 1, count: 15 }]);
    });
  });

  describe('getTopLinksForUser', () => {
    it('should return top links for a user', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { linkId: '1', shortCode: 'a', originalUrl: 'b', clicks: '20' },
      ]);
      const result = await repository.getTopLinksForUser(100, 2);
      expect(result).toEqual([{ linkId: 1, shortCode: 'a', originalUrl: 'b', clicks: 20 }]);
    });
  });

  describe('getGroupedStats', () => {
    it('should return grouped stats and handle null/fallback values', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { name: 'Chrome', count: '5' },
        { name: null, count: '3' },
      ]);

      const result = await repository.getGroupedStats(1, 'browser');

      expect(result).toEqual([
        { name: 'Chrome', count: 5 },
        { name: 'Unknown', count: 3 },
      ]);
    });

    it('should fallback to Direct for referrer stats', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([{ name: null, count: '10' }]);

      const result = await repository.getGroupedStats(1, 'referrer');

      expect(result).toEqual([{ name: 'Direct', count: 10 }]);
    });
  });
});
