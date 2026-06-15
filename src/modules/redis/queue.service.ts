import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class QueueService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async push(queueName: string, data: unknown): Promise<void> {
    const serialized = JSON.stringify(data);
    await this.redis.rpush(queueName, serialized);
  }

  async pop<T = unknown>(queueName: string): Promise<T | null> {
    const raw = await this.redis.lpop(queueName);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }

  async popBatch<T = unknown>(queueName: string, count: number): Promise<T[]> {
    if (count <= 0) {
      return [];
    }

    const results = await this.redis
      .multi()
      .lrange(queueName, 0, count - 1)
      .ltrim(queueName, count, -1)
      .exec();

    const rawItems = results?.[0]?.[1] as string[] | undefined;
    if (!rawItems?.length) {
      return [];
    }

    return rawItems.map((raw) => {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    });
  }
}
