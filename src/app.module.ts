import { Module } from '@nestjs/common';
import { ConfigsModule } from './config/config.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceModule } from './database/dataSource.module';
import { ConfigsService } from './config/config.service';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AuthModule } from './modules/auth/auth.module';
import { RedisModule } from './modules/redis/redis.module';
import { LinksModule } from './modules/links/links.module';
import { RedirectModule } from './modules/redirect/redirect.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { QrModule } from './modules/qr/qr.module';
import { UserModule } from './modules/user/user.module';
import { APP_GUARD } from '@nestjs/core';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    ConfigsModule,
    DataSourceModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigsService],
      imports: [ConfigsModule],
      useFactory: (configsService: ConfigsService) => {
        const dataSourceConfig = configsService.databaseConfig;
        return {
          ...dataSourceConfig,
        };
      },
    }),
    RedisModule,
    AuthModule,
    LinksModule,
    RedirectModule,
    AnalyticsModule,
    QrModule,
    UserModule,
    PrometheusModule.register({
      path: '/metrics',
    }),
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
