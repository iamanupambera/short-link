import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { generateOTP } from 'src/common/utils/generateOTP';

@Injectable()
export class OtpService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate a 6-digit OTP, store it in Redis with TTL, and return the OTP.
   */
  async createOtp(email: string, prefix: string = 'otp:'): Promise<string> {
    const otp = generateOTP(6);
    const ttl = parseInt(this.configService.getOrThrow<string>('OTP_EXPIRY_SECONDS'), 10);
    const key = prefix + email;

    await this.redis.set(key, otp, 'EX', ttl);

    return otp;
  }

  /**
   * Verify the OTP for a given email. Deletes the key on success.
   * Returns true if valid, false otherwise.
   */
  async verifyOtp(email: string, otp: string, prefix: string = 'otp:'): Promise<boolean> {
    const key = prefix + email;
    const storedOtp = await this.redis.get(key);

    if (!storedOtp || storedOtp !== otp) {
      return false;
    }

    // OTP is valid — delete it so it can't be reused
    await this.redis.del(key);
    return true;
  }
}
