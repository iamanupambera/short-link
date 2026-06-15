import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { REDIS_CLIENT } from '../redis/redis.constants';
import Redis from 'ioredis';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
      async () => {
        try {
          const res = await this.redis.ping();
          if (res === 'PONG') {
            return { redis: { status: 'up' } };
          }
          return { redis: { status: 'down', message: 'Ping response was not PONG' } };
        } catch (err) {
          return {
            redis: {
              status: 'down',
              message: err instanceof Error ? err.message : 'Unknown error',
            },
          };
        }
      },
    ]);
  }
}
