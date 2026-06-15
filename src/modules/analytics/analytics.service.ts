import { Injectable, NotFoundException } from '@nestjs/common';
import { ClicksRepository } from './repository/clicks.repository';
import { LinksRepository } from '../links/repository/links.repository';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly clickRepository: ClicksRepository,
    private readonly linkRepository: LinksRepository,
  ) {}

  /**
   * Get analytics for a specific link.
   */
  async getLinkAnalytics(linkId: number, userId: number) {
    // Ensure the link exists and belongs to the requesting user
    const link = await this.linkRepository.findLinkById(linkId, userId);

    if (!link) {
      throw new NotFoundException('Link not found or unauthorized');
    }

    const totalClicks = await this.clickRepository.countClicks(linkId);
    const uniqueVisitors = await this.clickRepository.countUniqueVisitors(linkId);

    const devices = await this.clickRepository.getGroupedStats(linkId, 'device');
    const browsers = await this.clickRepository.getGroupedStats(linkId, 'browser');
    const countries = await this.clickRepository.getGroupedStats(linkId, 'country');
    const referrers = await this.clickRepository.getGroupedStats(linkId, 'referrer');

    return {
      link: {
        id: link.id,
        shortCode: link.shortCode,
        originalUrl: link.originalUrl,
        customAlias: link.customAlias,
        createdAt: link.createdAt,
      },
      totalClicks,
      uniqueVisitors,
      devices,
      browsers,
      countries,
      referrers,
    };
  }

  /**
   * Get aggregated dashboard statistics for all links of a user.
   */
  async getDashboardAnalytics(userId: number) {
    const totalLinks = await this.linkRepository.count({ where: { userId } });

    if (totalLinks === 0) {
      return {
        totalLinks: 0,
        totalClicks: 0,
        uniqueVisitors: 0,
        clicksOverTime: [],
        topLinks: [],
      };
    }

    // Total clicks across all user's links
    const totalClicks = await this.clickRepository.countClicksForUserLinks(userId);

    // Unique visitors across all user's links
    const uniqueVisitors = await this.clickRepository.countUniqueVisitorsForUserLinks(userId);

    // Clicks over time (grouped by day, last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const clicksOverTime = await this.clickRepository.getClicksOverTimeForUserLinks(
      userId,
      sevenDaysAgo,
    );

    // Top links (by click count)
    const topLinks = await this.clickRepository.getTopLinksForUser(userId, 5);

    return {
      totalLinks,
      totalClicks,
      uniqueVisitors,
      clicksOverTime,
      topLinks,
    };
  }
}
