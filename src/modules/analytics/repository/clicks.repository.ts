import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Click } from '../entities/click.entity';
import { FilterModifier } from 'src/common/interfaces';

@Injectable()
export class ClicksRepository extends Repository<Click> {
  constructor(readonly dataSource: DataSource) {
    super(Click, dataSource.createEntityManager());
  }

  async countClicks(linkId: number, filters: FilterModifier[] = []): Promise<number> {
    const qb = this.createQueryBuilder('click').where('click.linkId = :linkId', { linkId });

    filters.forEach((f) => {
      qb.andWhere(f.clause, f.param);
    });

    return qb.getCount();
  }

  async countUniqueVisitors(linkId: number, filters: FilterModifier[] = []): Promise<number> {
    const qb = this.createQueryBuilder('click')
      .select('COUNT(DISTINCT(click.ipHash))', 'count')
      .where('click.linkId = :linkId', { linkId });

    filters.forEach((f) => {
      qb.andWhere(f.clause, f.param);
    });

    const result = await qb.getRawOne<{ count?: string }>();
    return parseInt(result?.count || '0', 10);
  }

  async countClicksForLinkIds(linkIds: number[]): Promise<number> {
    if (linkIds.length === 0) return 0;
    const qb = this.createQueryBuilder('click').where('click.linkId IN (:...linkIds)', { linkIds });
    return qb.getCount();
  }

  async countClicksForUserLinks(userId: number): Promise<number> {
    const qb = this.createQueryBuilder('click')
      .innerJoin('click.link', 'link')
      .where('link.userId = :userId', { userId });
    return qb.getCount();
  }

  async countUniqueVisitorsForLinkIds(linkIds: number[]): Promise<number> {
    if (linkIds.length === 0) return 0;
    const qb = this.createQueryBuilder('click')
      .select('COUNT(DISTINCT(click.ipHash))', 'count')
      .where('click.linkId IN (:...linkIds)', { linkIds });
    const result = await qb.getRawOne<{ count?: string }>();
    return parseInt(result?.count || '0', 10);
  }

  async countUniqueVisitorsForUserLinks(userId: number): Promise<number> {
    const qb = this.createQueryBuilder('click')
      .select('COUNT(DISTINCT(click.ipHash))', 'count')
      .innerJoin('click.link', 'link')
      .where('link.userId = :userId', { userId });
    const result = await qb.getRawOne<{ count?: string }>();
    return parseInt(result?.count || '0', 10);
  }

  async getClicksOverTime(
    linkIds: number[],
    sevenDaysAgo: Date,
  ): Promise<{ date: string; count: number }[]> {
    if (linkIds.length === 0) return [];

    const qb = this.createQueryBuilder('click')
      .select("DATE_FORMAT(click.createdAt, '%Y-%m-%d')", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('click.linkId IN (:...linkIds)', { linkIds })
      .andWhere('click.createdAt >= :sevenDaysAgo', { sevenDaysAgo })
      .groupBy("DATE_FORMAT(click.createdAt, '%Y-%m-%d')")
      .orderBy('date', 'ASC');

    const result = await qb.getRawMany<{ date: string; count: string }>();
    return result.map((r) => ({
      date: r.date,
      count: parseInt(r.count, 10),
    }));
  }

  async getClicksOverTimeForUserLinks(
    userId: number,
    sevenDaysAgo: Date,
  ): Promise<{ date: string; count: number }[]> {
    const qb = this.createQueryBuilder('click')
      .select("DATE_FORMAT(click.createdAt, '%Y-%m-%d')", 'date')
      .addSelect('COUNT(*)', 'count')
      .innerJoin('click.link', 'link')
      .where('link.userId = :userId', { userId })
      .andWhere('click.createdAt >= :sevenDaysAgo', { sevenDaysAgo })
      .groupBy("DATE_FORMAT(click.createdAt, '%Y-%m-%d')")
      .orderBy('date', 'ASC');

    const result = await qb.getRawMany<{ date: string; count: string }>();
    return result.map((r) => ({
      date: r.date,
      count: parseInt(r.count, 10),
    }));
  }

  async getTopLinks(
    linkIds: number[],
    limit: number = 5,
  ): Promise<{ linkId: number; count: number }[]> {
    if (linkIds.length === 0) return [];

    const qb = this.createQueryBuilder('click')
      .select('click.linkId', 'linkId')
      .addSelect('COUNT(*)', 'count')
      .where('click.linkId IN (:...linkIds)', { linkIds })
      .groupBy('click.linkId')
      .orderBy('count', 'DESC')
      .limit(limit);

    const result = await qb.getRawMany<{ linkId: string; count: string }>();
    return result.map((r) => ({
      linkId: parseInt(r.linkId, 10),
      count: parseInt(r.count, 10),
    }));
  }

  async getTopLinksForUser(
    userId: number,
    limit: number = 5,
  ): Promise<{ linkId: number; shortCode: string; originalUrl: string; clicks: number }[]> {
    const qb = this.createQueryBuilder('click')
      .select('click.linkId', 'linkId')
      .addSelect('link.shortCode', 'shortCode')
      .addSelect('link.originalUrl', 'originalUrl')
      .addSelect('COUNT(*)', 'clicks')
      .innerJoin('click.link', 'link')
      .where('link.userId = :userId', { userId })
      .groupBy('click.linkId')
      .addGroupBy('link.shortCode')
      .addGroupBy('link.originalUrl')
      .orderBy('clicks', 'DESC')
      .limit(limit);

    const result = await qb.getRawMany<{
      linkId: string;
      shortCode: string;
      originalUrl: string;
      clicks: string;
    }>();

    return result.map((r) => ({
      linkId: parseInt(r.linkId, 10),
      shortCode: r.shortCode,
      originalUrl: r.originalUrl,
      clicks: parseInt(r.clicks, 10),
    }));
  }

  async getGroupedStats(
    linkId: number,
    column: 'device' | 'browser' | 'country' | 'referrer',
  ): Promise<{ name: string; count: number }[]> {
    const qb = this.createQueryBuilder('click')
      .select(`click.${column}`, 'name')
      .addSelect('COUNT(*)', 'count')
      .where('click.linkId = :linkId', { linkId })
      .groupBy(`click.${column}`)
      .orderBy('count', 'DESC');

    const result = await qb.getRawMany<{ name: string | null; count: string }>();
    return result.map((r) => ({
      name: r.name || (column === 'referrer' ? 'Direct' : 'Unknown'),
      count: parseInt(r.count, 10),
    }));
  }
}
