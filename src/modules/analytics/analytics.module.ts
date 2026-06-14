import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Click } from './entities/click.entity';
import { Link } from '../links/entities/link.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsWorker } from './analytics.worker';
import { ClicksRepository } from './repository/clicks.repository';
import { LinksModule } from '../links/links.module';

@Module({
  imports: [TypeOrmModule.forFeature([Click, Link]), LinksModule],
  providers: [AnalyticsService, AnalyticsWorker, ClicksRepository],
  controllers: [AnalyticsController],
  exports: [AnalyticsService, ClicksRepository],
})
export class AnalyticsModule {}
