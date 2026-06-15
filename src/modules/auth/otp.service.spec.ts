import { OtpService } from './otp.service';

describe('OtpService', () => {
  let service: OtpService;
  let redis: { set: jest.Mock; get: jest.Mock; del: jest.Mock };
  let configService: { getOrThrow: jest.Mock };

  beforeEach(() => {
    redis = { set: jest.fn(), get: jest.fn(), del: jest.fn() };
    configService = { getOrThrow: jest.fn().mockReturnValue('600') };
    service = new OtpService(redis as any, configService as any);
  });

  describe('createOtp', () => {
    it('should generate a 6-digit OTP and store in Redis with TTL', async () => {
      const otp = await service.createOtp('user@test.com');
      expect(otp).toHaveLength(6);
      expect(otp).toMatch(/^\d+$/);
      expect(redis.set).toHaveBeenCalledWith('otp:user@test.com', otp, 'EX', 600);
    });

    it('should use custom prefix', async () => {
      await service.createOtp('user@test.com', 'reset_otp:');
      expect(redis.set).toHaveBeenCalledWith(
        'reset_otp:user@test.com',
        expect.any(String),
        'EX',
        600,
      );
    });
  });

  describe('verifyOtp', () => {
    it('should return true and delete key when OTP matches', async () => {
      redis.get.mockResolvedValue('123456');
      const result = await service.verifyOtp('user@test.com', '123456');
      expect(result).toBe(true);
      expect(redis.del).toHaveBeenCalledWith('otp:user@test.com');
    });

    it('should return false when OTP does not match', async () => {
      redis.get.mockResolvedValue('123456');
      const result = await service.verifyOtp('user@test.com', '999999');
      expect(result).toBe(false);
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('should return false when no OTP stored', async () => {
      redis.get.mockResolvedValue(null);
      const result = await service.verifyOtp('user@test.com', '123456');
      expect(result).toBe(false);
    });

    it('should use custom prefix', async () => {
      redis.get.mockResolvedValue('654321');
      await service.verifyOtp('user@test.com', '654321', 'reset_otp:');
      expect(redis.get).toHaveBeenCalledWith('reset_otp:user@test.com');
      expect(redis.del).toHaveBeenCalledWith('reset_otp:user@test.com');
    });
  });
});
