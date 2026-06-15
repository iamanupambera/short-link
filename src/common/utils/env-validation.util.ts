import { Logger } from '@nestjs/common';

export function validateEnvironment(): void {
  const logger = new Logger('EnvironmentValidation');
  const requiredVars = [
    'PORT',
    'NODE_ENV',
    'CLIENT_URL',
    'API_URL',
    'ACCESS_TOKEN_SECRET',
    'ACCESS_TOKEN_EXPIRY',
    'REFRESH_TOKEN_EXPIRY',
    'BCRYPT_SALT_ROUNDS',
    'OTP_EXPIRY_SECONDS',
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB',
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_PASSWORD',
    'IP_SALT_SECRET',
  ];

  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    const errorMsg = `FATAL: Missing required environment variables: ${missing.join(', ')}`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  const nodeEnv = process.env.NODE_ENV?.toUpperCase() || 'DEVELOPMENT';

  if (nodeEnv === 'PRODUCTION') {
    // Check for weak secrets
    const accessSecret = process.env.ACCESS_TOKEN_SECRET || '';
    if (
      accessSecret.includes('!') ||
      accessSecret.length < 32 ||
      accessSecret === 'youraccesstoken!!!!!!!!!!!!!!!!'
    ) {
      const errorMsg =
        'FATAL: ACCESS_TOKEN_SECRET is too weak or uses default values for PRODUCTION.';
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    const ipSalt = process.env.IP_SALT_SECRET || '';
    if (ipSalt === 'shortlinkipsaltsecretkeys123' || ipSalt.length < 16) {
      const errorMsg = 'FATAL: IP_SALT_SECRET is too weak or uses default values for PRODUCTION.';
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Ensure SUPER_ADMIN_PASSWORD is set
    if (!process.env.SUPER_ADMIN_PASSWORD) {
      const errorMsg = 'FATAL: SUPER_ADMIN_PASSWORD must be configured in PRODUCTION.';
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
  } else {
    logger.log(`Environment validation passed. Mode: ${nodeEnv}`);
  }
}
