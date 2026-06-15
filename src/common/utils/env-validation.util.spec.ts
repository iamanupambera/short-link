import { validateEnvironment } from './env-validation.util';

describe('validateEnvironment', () => {
  const originalEnv = process.env;

  const validEnv: Record<string, string> = {
    PORT: '3000',
    NODE_ENV: 'DEVELOPMENT',
    CLIENT_URL: 'http://localhost:3001',
    API_URL: 'http://localhost:3000',
    ACCESS_TOKEN_SECRET: 'testsecret',
    ACCESS_TOKEN_EXPIRY: '1h',
    REFRESH_TOKEN_EXPIRY: '30d',
    BCRYPT_SALT_ROUNDS: '10',
    OTP_EXPIRY_SECONDS: '600',
    DB_HOST: 'localhost',
    DB_PORT: '3306',
    DB_USERNAME: 'root',
    DB_PASSWORD: 'password',
    DB: 'shortlink',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    REDIS_PASSWORD: 'redis_pass',
    IP_SALT_SECRET: 'shortlinkipsaltsecretkeys123',
  };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should pass when all required variables are present (development)', () => {
    Object.assign(process.env, validEnv);
    expect(() => validateEnvironment()).not.toThrow();
  });

  it('should throw when required variables are missing', () => {
    // Set nothing
    process.env = {};
    expect(() => validateEnvironment()).toThrow('Missing required environment variables');
  });

  it('should throw when a subset of variables is missing', () => {
    Object.assign(process.env, validEnv);
    delete process.env.REDIS_HOST;
    delete process.env.DB;
    expect(() => validateEnvironment()).toThrow('REDIS_HOST');
  });

  it('should throw in PRODUCTION when ACCESS_TOKEN_SECRET is too short', () => {
    Object.assign(process.env, validEnv, {
      NODE_ENV: 'PRODUCTION',
      ACCESS_TOKEN_SECRET: 'short',
      IP_SALT_SECRET: 'a_long_enough_ip_salt_secret_here',
      SUPER_ADMIN_PASSWORD: 'Admin@123456',
    });
    expect(() => validateEnvironment()).toThrow('ACCESS_TOKEN_SECRET is too weak');
  });

  it('should throw in PRODUCTION when ACCESS_TOKEN_SECRET contains "!"', () => {
    Object.assign(process.env, validEnv, {
      NODE_ENV: 'PRODUCTION',
      ACCESS_TOKEN_SECRET: 'this!has!exclamation!marks!!!!!!!!!!!!',
      IP_SALT_SECRET: 'a_long_enough_ip_salt_secret_here',
      SUPER_ADMIN_PASSWORD: 'Admin@123456',
    });
    expect(() => validateEnvironment()).toThrow('ACCESS_TOKEN_SECRET is too weak');
  });

  it('should throw in PRODUCTION when IP_SALT_SECRET uses default value', () => {
    Object.assign(process.env, validEnv, {
      NODE_ENV: 'PRODUCTION',
      ACCESS_TOKEN_SECRET: 'a_very_long_strong_secret_for_production_use_only',
      IP_SALT_SECRET: 'shortlinkipsaltsecretkeys123',
      SUPER_ADMIN_PASSWORD: 'Admin@123456',
    });
    expect(() => validateEnvironment()).toThrow('IP_SALT_SECRET is too weak');
  });

  it('should throw in PRODUCTION when IP_SALT_SECRET is too short', () => {
    Object.assign(process.env, validEnv, {
      NODE_ENV: 'PRODUCTION',
      ACCESS_TOKEN_SECRET: 'a_very_long_strong_secret_for_production_use_only',
      IP_SALT_SECRET: 'short',
      SUPER_ADMIN_PASSWORD: 'Admin@123456',
    });
    expect(() => validateEnvironment()).toThrow('IP_SALT_SECRET is too weak');
  });

  it('should throw in PRODUCTION when SUPER_ADMIN_PASSWORD is missing', () => {
    Object.assign(process.env, validEnv, {
      NODE_ENV: 'PRODUCTION',
      ACCESS_TOKEN_SECRET: 'a_very_long_strong_secret_for_production_use_only',
      IP_SALT_SECRET: 'a_long_enough_ip_salt_secret_here',
    });
    delete process.env.SUPER_ADMIN_PASSWORD;
    expect(() => validateEnvironment()).toThrow('SUPER_ADMIN_PASSWORD must be configured');
  });

  it('should pass in PRODUCTION when all secrets are strong', () => {
    Object.assign(process.env, validEnv, {
      NODE_ENV: 'PRODUCTION',
      ACCESS_TOKEN_SECRET: 'a_very_long_strong_secret_for_production_use_only',
      IP_SALT_SECRET: 'a_long_enough_ip_salt_secret_here',
      SUPER_ADMIN_PASSWORD: 'Admin@123456',
    });
    expect(() => validateEnvironment()).not.toThrow();
  });
});
