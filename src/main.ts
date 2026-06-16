import { validateEnvironment } from './common/utils/env-validation.util';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, RequestMethod, Logger } from '@nestjs/common';
import { winstonConfig } from './config/winston.config';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { config } from 'dotenv';
import helmet from 'helmet';

async function bootstrap() {
  // Load environment variables and validate
  config();
  validateEnvironment();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV')?.toLowerCase();

  // Application setup
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: ':shortCode/unlock', method: RequestMethod.POST },
      { path: ':shortCode', method: RequestMethod.GET },
      { path: 'metrics', method: RequestMethod.GET },
      { path: 'health', method: RequestMethod.GET },
    ],
  });

  if (nodeEnv !== 'production') {
    // Swagger configuration
    const config = new DocumentBuilder()
      .setTitle('SHORT LINK API')
      .setDescription('SHORT LINK API')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth()
      .addTag('PATS')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document, {
      jsonDocumentUrl: 'api-docs/json',
      swaggerOptions: {
        persistAuthorization: true,
        withCredentials: true,
      },
    });
  }

  // port setup
  const port = configService.getOrThrow<number>('PORT');

  // CORS setup
  app.enableCors({
    origin: [configService.getOrThrow('CLIENT_URL')],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  app.use(cookieParser());

  const trustProxyEnv = configService.get<string>('TRUST_PROXY') || 'loopback';
  let trustProxyValue: string | number | boolean;
  if (trustProxyEnv === 'true') {
    trustProxyValue = true;
  } else if (trustProxyEnv === 'false') {
    trustProxyValue = false;
  } else if (!isNaN(Number(trustProxyEnv))) {
    trustProxyValue = Number(trustProxyEnv);
  } else {
    trustProxyValue = trustProxyEnv;
  }
  app.set('trust proxy', trustProxyValue);

  // Helmet setup
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`, 'https://fonts.googleapis.com'],
          fontSrc: [`'self'`, 'https://fonts.gstatic.com'],
          imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
          scriptSrc: [`'self'`, `'unsafe-inline'`],
          manifestSrc: [`'self'`],
          frameSrc: [`'self'`],
          connectSrc: [`'self'`],
        },
      },
    }),
  );

  await app.listen(port);
}

bootstrap().catch((err) => {
  new Logger('Bootstrap').error(err);
});
