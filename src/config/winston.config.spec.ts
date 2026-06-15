import * as winston from 'winston';

describe('winstonConfig', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.resetModules();
  });

  it('should create debug level console transport when NODE_ENV is DEVELOPMENT', () => {
    process.env.NODE_ENV = 'DEVELOPMENT';
    const { winstonConfig } = require('./winston.config');
    expect(winstonConfig.transports).toHaveLength(1);
    expect(winstonConfig.transports[0]).toBeInstanceOf(winston.transports.Console);
    expect(winstonConfig.transports[0].level).toBe('debug');
  });

  it('should create info level console transport and file transports when NODE_ENV is PRODUCTION', () => {
    process.env.NODE_ENV = 'PRODUCTION';
    const { winstonConfig } = require('./winston.config');
    expect(winstonConfig.transports.length).toBeGreaterThan(1);
    expect(winstonConfig.transports[0]).toBeInstanceOf(winston.transports.Console);
    expect(winstonConfig.transports[0].level).toBe('info');

    const fileTransports = winstonConfig.transports.filter(
      (t: any) => t instanceof winston.transports.File,
    );
    expect(fileTransports).toHaveLength(2);
  });
});
