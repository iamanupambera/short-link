import * as winston from 'winston';

export const winstonConfig = {
  transports: [
    new winston.transports.Console({
      level: process.env.NODE_ENV?.toUpperCase() === 'PRODUCTION' ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        process.env.NODE_ENV?.toUpperCase() === 'PRODUCTION'
          ? winston.format.json()
          : winston.format.combine(
              winston.format.colorize({ all: true }),
              winston.format.printf((info) => {
                const rawInfo = info as Record<string, unknown>;
                const timestamp = typeof rawInfo.timestamp === 'string' ? rawInfo.timestamp : '';
                const level = typeof rawInfo.level === 'string' ? rawInfo.level : '';
                const message = typeof rawInfo.message === 'string' ? rawInfo.message : '';
                const context = typeof rawInfo.context === 'string' ? `[${rawInfo.context}] ` : '';
                return `${timestamp} ${level}: ${context}${message}`;
              }),
            ),
      ),
    }),
    ...(process.env.NODE_ENV?.toUpperCase() === 'PRODUCTION'
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: winston.format.combine(
              winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
              winston.format.json(),
            ),
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            format: winston.format.combine(
              winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
              winston.format.json(),
            ),
          }),
        ]
      : []),
  ],
};
