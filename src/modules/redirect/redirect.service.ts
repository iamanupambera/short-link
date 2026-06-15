import { LinksRepository } from '../links/repository/links.repository';
import { Link, LinkStatus } from '../links/entities/link.entity';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { QueueService } from '../redis/queue.service';
import { Inject, Injectable } from '@nestjs/common';
import { type Request } from 'express';
import { compare } from 'bcrypt';
import Redis from 'ioredis';
import * as crypto from 'crypto';

@Injectable()
export class RedirectService {
  constructor(
    private readonly linkRepository: LinksRepository,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly queueService: QueueService,
  ) {}

  async resolveRedirect(shortCode: string, unlockToken: string | undefined, req: Request) {
    const cacheKey = `short:${shortCode}`;
    let linkData: Partial<Link> | null = null;

    // 1. Try Cache Lookup
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        linkData = JSON.parse(cached) as Partial<Link>;
      } catch {
        linkData = null;
      }
    }

    // 2. Try DB Lookup if not cached
    if (!linkData) {
      const link = await this.linkRepository.findLinkByCode(shortCode);

      if (!link) {
        return {
          type: 'error',
          errorTitle: 'Link Not Found',
          errorDescription: 'The link you are trying to access does not exist or has been deleted.',
          statusCode: 404,
        };
      }

      linkData = {
        id: link.id,
        userId: link.userId,
        shortCode: link.shortCode,
        originalUrl: link.originalUrl,
        customAlias: link.customAlias,
        passwordHash: link.passwordHash,
        expiresAt: link.expiresAt ? link.expiresAt : null,
        status: link.status,
      };

      // Cache it for 24 hours
      await this.redis.set(cacheKey, JSON.stringify(linkData), 'EX', 86400);
    }

    // 3. Validate Link Status
    if (linkData?.status === LinkStatus.INACTIVE) {
      return {
        type: 'error',
        errorTitle: 'Link Inactive',
        errorDescription: 'This short link is currently inactive.',
        statusCode: 403,
      };
    }

    // 4. Validate Expiration
    if (linkData?.expiresAt) {
      const expiry = new Date(linkData.expiresAt);
      if (expiry.getTime() < Date.now()) {
        return {
          type: 'error',
          errorTitle: 'Link Expired',
          errorDescription: 'This short link has expired.',
          statusCode: 410,
        };
      }
    }

    // 5. Validate Password Protection
    if (linkData?.passwordHash) {
      if (!unlockToken) {
        return {
          type: 'password_prompt',
          isRetry: false,
        };
      }

      const tokenKey = `unlock:${shortCode}:${unlockToken}`;
      const tokenValid = await this.redis.get(tokenKey);
      if (!tokenValid) {
        return {
          type: 'password_prompt',
          isRetry: true,
        };
      }

      // Single-use token: delete immediately
      await this.redis.del(tokenKey);
    }

    // 6. Queue Click Analytics Event Asynchronously
    // Retrieve IP (taking into account proxies)
    const xForwardedFor = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor) ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    const cleanIp = ip.split(',')[0].trim();

    const cfIpCountry = req.headers['cf-ipcountry'];
    const xCountryCode = req.headers['x-country-code'];
    const country =
      (Array.isArray(cfIpCountry) ? cfIpCountry[0] : cfIpCountry) ||
      (Array.isArray(xCountryCode) ? xCountryCode[0] : xCountryCode) ||
      '';

    const clickEvent = {
      linkId: linkData?.id,
      ip: cleanIp,
      userAgent: req.headers['user-agent'] || '',
      referrer: req.headers['referer'] || '',
      country,
      timestamp: new Date().toISOString(),
    };

    // Push click details to Redis queue
    await this.queueService.push('analytics_clicks_queue', clickEvent);

    // 7. Success - Perform Redirect
    return {
      type: 'redirect',
      url: linkData?.originalUrl || '',
    };
  }

  async unlockLink(shortCode: string, password?: string): Promise<{ token: string } | null> {
    if (!password) {
      return null;
    }

    const cacheKey = `short:${shortCode}`;
    let linkData: Partial<Link> | null = null;

    // 1. Try Cache Lookup
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        linkData = JSON.parse(cached) as Partial<Link>;
      } catch {
        linkData = null;
      }
    }

    // 2. Try DB Lookup if not cached
    if (!linkData) {
      const link = await this.linkRepository.findLinkByCode(shortCode);
      if (!link) {
        return null;
      }

      linkData = {
        id: link.id,
        userId: link.userId,
        shortCode: link.shortCode,
        originalUrl: link.originalUrl,
        customAlias: link.customAlias,
        passwordHash: link.passwordHash,
        expiresAt: link.expiresAt ? link.expiresAt : null,
        status: link.status,
      };

      // Cache it for 24 hours
      await this.redis.set(cacheKey, JSON.stringify(linkData), 'EX', 86400);
    }

    if (!linkData.passwordHash) {
      return null;
    }

    const isPasswordCorrect = await compare(password, linkData.passwordHash);
    if (!isPasswordCorrect) {
      return null;
    }

    const unlockToken = crypto.randomUUID();
    const tokenKey = `unlock:${shortCode}:${unlockToken}`;
    // Store in Redis with 60 seconds TTL
    await this.redis.set(tokenKey, 'valid', 'EX', 60);

    return { token: unlockToken };
  }
}
