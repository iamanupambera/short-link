import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../modules/redis/redis.constants';
import { Request } from 'express';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: Request = context.switchToHttp().getRequest();
    const controllerName = context.getClass().name;
    const isRedirect = controllerName === 'RedirectController';
    const limit = isRedirect ? 3000 : 100;

    // 1. Determine client identifier (user ID or IP)
    let key = '';
    if (req.user && req.user.userId) {
      key = `rate_limit:${isRedirect ? 'redirect' : 'api'}:user:${req.user.userId}`;
    } else {
      const xForwardedFor = req.headers['x-forwarded-for'];
      const ip =
        (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor) ||
        req.socket.remoteAddress ||
        '127.0.0.1';
      const cleanIp = ip.split(',')[0].trim();
      key = `rate_limit:${isRedirect ? 'redirect' : 'api'}:ip:${cleanIp}`;
    }

    // 2. Atomic increment & TTL check in Redis
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.ttl(key);
    const results = await pipeline.exec();

    if (!results) {
      return true; // Fallback if execution fails
    }

    const count = results[0][1] as number;
    const ttl = results[1][1] as number;

    // Set expiration on first request
    if (ttl === -1) {
      await this.redis.expire(key, 60);
    }

    // 3. Throttle check
    if (count > limit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again after a minute.',
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
