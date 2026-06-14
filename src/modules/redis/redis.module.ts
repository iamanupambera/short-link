import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { QueueService } from './queue.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('RedisModule');

        const client = new Redis({
          host: configService.getOrThrow<string>('REDIS_HOST'),
          port: parseInt(configService.getOrThrow<string>('REDIS_PORT'), 10),
          password: configService.getOrThrow<string>('REDIS_PASSWORD') || undefined,
          db: parseInt(configService.getOrThrow<string>('REDIS_DB'), 10),
        });

        client.on('connect', () => {
          logger.log('Redis connected successfully');
        });

        client.on('error', (err) => {
          logger.error('Redis connection error', err);
        });

        return client;
      },
    },
    QueueService,
  ],
  exports: [REDIS_CLIENT, QueueService],
})
export class RedisModule {}
