import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { QueueService } from '../redis/queue.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { UAParser } from 'ua-parser-js';
import { ClicksRepository } from './repository/clicks.repository';
import { ClickEvent } from './interface';

@Injectable()
export class AnalyticsWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(AnalyticsWorker.name);
  private isRunning = false;
  private loopTimeout: NodeJS.Timeout | null = null;
  private ipSalt = '';
  private readonly batchSize: number;

  constructor(
    private readonly clickRepository: ClicksRepository,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {
    this.ipSalt = this.configService.getOrThrow<string>('IP_SALT_SECRET');
    this.batchSize = parseInt(this.configService.get<string>('ANALYTICS_BATCH_SIZE') || '100', 10);
  }

  onApplicationBootstrap() {
    this.isRunning = true;
    this.logger.log('Analytics Worker background loop started.');
    void this.processLoop();
  }

  onApplicationShutdown() {
    this.isRunning = false;
    if (this.loopTimeout) {
      clearTimeout(this.loopTimeout);
    }
    this.logger.log('Analytics Worker background loop stopped.');
  }

  private async processLoop() {
    if (!this.isRunning) return;

    try {
      const events = await this.queueService.popBatch<ClickEvent>(
        'analytics_clicks_queue',
        this.batchSize,
      );

      if (events.length > 0) {
        await this.processClickEvents(events);
        // If we processed events, run immediately for the next batch
        this.loopTimeout = setTimeout(() => {
          void this.processLoop();
        }, 0);
      } else {
        // If queue is empty, wait 500ms before polling again
        this.loopTimeout = setTimeout(() => {
          void this.processLoop();
        }, 500);
      }
    } catch (err) {
      this.logger.error('Error in analytics worker loop:', err);
      // Wait 2000ms on error before retrying
      this.loopTimeout = setTimeout(() => {
        void this.processLoop();
      }, 2000);
    }
  }

  private async processClickEvents(events: ClickEvent[]) {
    const clicks = events.map((event) => this.buildClickEntity(event));
    await this.clickRepository.save(clicks, { chunk: 100 });
  }

  private buildClickEntity(event: {
    linkId: number;
    ip: string;
    userAgent: string;
    referrer: string;
    country?: string;
    timestamp: string;
  }) {
    const { linkId, ip, userAgent, referrer, country: queuedCountry, timestamp } = event;

    // 1. Hash IP for privacy compliance
    const ipHash = crypto.createHmac('sha256', this.ipSalt).update(ip).digest('hex');

    // 2. Parse User Agent for Browser and Device
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser().name || 'Unknown';
    let device = parser.getDevice().type || 'desktop';
    if (
      device === 'mobile' ||
      device === 'tablet' ||
      device === 'smarttv' ||
      device === 'wearable'
    ) {
      // Keep it
    } else {
      device = 'desktop'; // Default
    }

    // 3. Resolve Country
    let country = queuedCountry || 'Unknown';
    if (country === 'Unknown' || country === '') {
      if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        country = 'Local';
      } else {
        country = 'Unknown';
      }
    }

    // 4. Parse Referrer Domain
    let cleanReferrer = 'Direct';
    if (referrer) {
      try {
        const url = new URL(referrer);
        cleanReferrer = url.hostname;
      } catch {
        cleanReferrer = 'Direct';
      }
    }

    return this.clickRepository.create({
      linkId,
      ipHash,
      country,
      browser,
      device,
      referrer: cleanReferrer,
      createdAt: new Date(timestamp),
    });
  }
}
