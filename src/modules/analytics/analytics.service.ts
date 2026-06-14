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
    // Get all links for the user
    const [links] = await this.linkRepository.findAndCountAll(userId, 1, 1000);

    if (links.length === 0) {
      return {
        totalLinks: 0,
        totalClicks: 0,
        uniqueVisitors: 0,
        clicksOverTime: [],
        topLinks: [],
      };
    }

    const linkIds = links.map((l) => l.id);

    // Total clicks across all user's links
    const totalClicks = await this.clickRepository.countClicksForLinkIds(linkIds);

    // Unique visitors across all user's links
    const uniqueVisitors = await this.clickRepository.countUniqueVisitorsForLinkIds(linkIds);

    // Clicks over time (grouped by day, last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const clicksOverTime = await this.clickRepository.getClicksOverTime(linkIds, sevenDaysAgo);

    // Top links (by click count)
    const topLinksRaw = await this.clickRepository.getTopLinks(linkIds, 5);

    const topLinks = topLinksRaw.map((tl) => {
      const link = links.find((l) => l.id === tl.linkId);
      return {
        linkId: tl.linkId,
        shortCode: link?.shortCode || '',
        originalUrl: link?.originalUrl || '',
        clicks: tl.count,
      };
    });

    return {
      totalLinks: links.length,
      totalClicks,
      uniqueVisitors,
      clicksOverTime,
      topLinks,
    };
  }
}
