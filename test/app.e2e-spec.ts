import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  INestApplication,
  ValidationPipe,
  Module,
} from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import express, { Request, Response } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { AnalyticsController } from '../src/modules/analytics/analytics.controller';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { AuthController } from '../src/modules/auth/auth.controller';
import { UserRole, UserStatus } from '../src/modules/auth/entities/user.entity';
import { AuthService } from '../src/modules/auth/auth.service';
import { HealthController } from '../src/modules/health/health.controller';
import { LinksController } from '../src/modules/links/links.controller';
import { LinkStatus } from '../src/modules/links/entities/link.entity';
import { LinksService } from '../src/modules/links/links.service';
import { QrController } from '../src/modules/qr/qr.controller';
import { QrService } from '../src/modules/qr/qr.service';
import { RedirectController } from '../src/modules/redirect/redirect.controller';
import { RedirectService } from '../src/modules/redirect/redirect.service';
import { UserSuperAdminController } from '../src/modules/user/user.super-admin.controller';
import { UserSuperAdminService } from '../src/modules/user/user.super-admin.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { ConfigService } from '@nestjs/config';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { REDIS_CLIENT } from '../src/modules/redis/redis.constants';

class E2eJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new ForbiddenException('Access Denied');
    }

    request.user = {
      email: 'e2e@example.com',
      userId: 101,
      role: request.headers['x-e2e-role'] || UserRole.USER,
      sessionKey: 'e2e-session',
    };

    return true;
  }
}

describe('HTTP API (e2e)', () => {
  let app: INestApplication<App>;

  const authService = {
    register: jest.fn(),
    login: jest.fn(),
    resendVerificationEmail: jest.fn(),
    verifyEmail: jest.fn(),
    getMe: jest.fn(),
    getRefreshToken: jest.fn(),
    updateUserDetails: jest.fn(),
    logout: jest.fn(),
    updateProfilePicture: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };

  const linksService = {
    createLink: jest.fn(),
    getLinks: jest.fn(),
    getLinkById: jest.fn(),
    updateLink: jest.fn(),
    deleteLink: jest.fn(),
  };

  const analyticsService = {
    getDashboardAnalytics: jest.fn(),
    getLinkAnalytics: jest.fn(),
  };

  const qrService = {
    generateQrCodeBuffer: jest.fn(),
  };

  const redirectService = {
    resolveRedirect: jest.fn(),
    unlockLink: jest.fn(),
  };

  const userSuperAdminService = {
    getUsers: jest.fn(),
    getUserById: jest.fn(),
    updateUserStatus: jest.fn(),
  };

  const configServiceMock = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'API_URL') {
        return 'https://sho.rt';
      }
      return undefined;
    }),
  };

  @Module({
    controllers: [AuthController],
    providers: [{ provide: AuthService, useValue: authService }],
  })
  class MockAuthModule {}

  @Module({
    controllers: [LinksController],
    providers: [{ provide: LinksService, useValue: linksService }],
  })
  class MockLinksModule {}

  @Module({
    controllers: [AnalyticsController],
    providers: [{ provide: AnalyticsService, useValue: analyticsService }],
  })
  class MockAnalyticsModule {}

  @Module({
    controllers: [QrController],
    providers: [
      { provide: QrService, useValue: qrService },
      { provide: LinksService, useValue: linksService },
      { provide: ConfigService, useValue: configServiceMock },
    ],
  })
  class MockQrModule {}

  @Module({
    controllers: [UserSuperAdminController],
    providers: [{ provide: UserSuperAdminService, useValue: userSuperAdminService }],
  })
  class MockAdminModule {}

  @Module({
    controllers: [RedirectController],
    providers: [{ provide: RedirectService, useValue: redirectService }],
  })
  class MockRedirectModule {}

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MockAuthModule,
        MockLinksModule,
        MockAnalyticsModule,
        MockQrModule,
        MockAdminModule,
        RouterModule.register([
          { path: 'api/v1', module: MockAuthModule },
          { path: 'api/v1', module: MockLinksModule },
          { path: 'api/v1', module: MockAnalyticsModule },
          { path: 'api/v1', module: MockQrModule },
          { path: 'api/v1', module: MockAdminModule },
        ]),
        PrometheusModule.register({
          path: '/metrics',
        }),
        MockRedirectModule,
      ],
      controllers: [HealthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: LinksService, useValue: linksService },
        { provide: AnalyticsService, useValue: analyticsService },
        { provide: QrService, useValue: qrService },
        { provide: RedirectService, useValue: redirectService },
        { provide: UserSuperAdminService, useValue: userSuperAdminService },
        RolesGuard,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn((indicators: Array<() => Promise<object> | object>) => {
              const details = indicators.map((indicator) => indicator());
              return {
                status: 'ok',
                info: Object.assign({}, ...details),
                error: {},
                details: Object.assign({}, ...details),
              };
            }),
          },
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: {
            pingCheck: jest.fn((name: string) => ({ [name]: { status: 'up' } })),
          },
        },
        {
          provide: REDIS_CLIENT,
          useValue: {
            ping: jest.fn(() => 'PONG'),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(E2eJwtGuard)
      .compile();

    app = moduleFixture.createNestApplication();

    app.use(cookieParser());
    app.use(express.urlencoded({ extended: true }));

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    authService.register.mockResolvedValue({
      statusCode: 201,
      message: 'User register successfully',
      response: { id: 1, email: 'user@example.com' },
    });
    authService.login.mockImplementation((_dto, res: Response) => {
      res.cookie('refresh-token', 'refresh-token-value');
      return {
        statusCode: 200,
        message: 'User logged in successfully',
        response: { accessToken: 'access-token-value' },
      };
    });
    authService.resendVerificationEmail.mockResolvedValue({
      statusCode: 200,
      message: 'Successfully send verification mail',
    });
    authService.verifyEmail.mockImplementation((_dto, res: Response) => {
      res.cookie('refresh-token', 'refresh-token-value');
      return {
        statusCode: 200,
        message: 'Email verified successfully',
        response: {
          accessToken: 'access-token-value',
          user: { id: 1, email: 'user@example.com' },
        },
      };
    });
    authService.getMe.mockResolvedValue({
      statusCode: 200,
      message: 'User information retrieved successfully',
      response: { id: 101, email: 'e2e@example.com' },
    });
    authService.getRefreshToken.mockResolvedValue({
      statusCode: 200,
      message: 'Access token refreshed successfully',
      response: { accessToken: 'new-access-token' },
    });
    authService.updateUserDetails.mockResolvedValue({
      statusCode: 200,
      message: 'User details updated successfully',
      response: { id: 101, name: 'Updated User' },
    });
    authService.logout.mockImplementation((res: Response) => {
      res.clearCookie('refresh-token');
      return { statusCode: 200, message: 'Successfully logged out' };
    });
    authService.updateProfilePicture.mockResolvedValue({
      statusCode: 200,
      message: 'Profile updated successfully',
      response: { profilePicture: 'avatar.png' },
    });
    authService.forgotPassword.mockResolvedValue({
      statusCode: 200,
      message: 'OTP sent successfully',
    });
    authService.resetPassword.mockResolvedValue({
      statusCode: 200,
      message: 'Password reset successfully',
    });

    linksService.createLink.mockResolvedValue({
      id: 10,
      originalUrl: 'https://example.com',
      shortCode: 'abc123',
    });
    linksService.getLinks.mockResolvedValue({
      data: [{ id: 10, shortCode: 'abc123' }],
      pagination: { page: 2, limit: 5, total: 1 },
    });
    linksService.getLinkById.mockResolvedValue({
      id: 10,
      shortCode: 'abc123',
      originalUrl: 'https://example.com',
    });
    linksService.updateLink.mockResolvedValue({
      id: 10,
      status: LinkStatus.INACTIVE,
    });
    linksService.deleteLink.mockResolvedValue(undefined);

    analyticsService.getDashboardAnalytics.mockResolvedValue({
      totalLinks: 3,
      totalClicks: 42,
    });
    analyticsService.getLinkAnalytics.mockResolvedValue({
      linkId: 10,
      clicks: 7,
    });

    qrService.generateQrCodeBuffer.mockResolvedValue(Buffer.from('fake-png'));

    redirectService.resolveRedirect.mockResolvedValue({
      type: 'redirect',
      url: 'https://example.com',
    });
    redirectService.unlockLink.mockResolvedValue({ token: 'unlock-token' });

    userSuperAdminService.getUsers.mockResolvedValue({
      data: [{ id: 1, email: 'user@example.com' }],
      pagination: { page: 1, limit: 10, total: 1 },
    });
    userSuperAdminService.getUserById.mockResolvedValue({
      id: 1,
      email: 'user@example.com',
    });
    userSuperAdminService.updateUserStatus.mockResolvedValue({
      id: 1,
      status: UserStatus.INACTIVE,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('auth', () => {
    it('validates registration payloads', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/register').send({}).expect(400);
      expect(authService.register).not.toHaveBeenCalled();
    });

    it('registers a user with a valid payload', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Example User',
          email: 'user@example.com',
          password: 'StrongPass1!',
        })
        .expect(201);

      expect(response.body.message).toBe('User register successfully');
      expect(authService.register).toHaveBeenCalledWith({
        name: 'Example User',
        email: 'user@example.com',
        password: 'StrongPass1!',
      });
    });

    it('logs in and sets the refresh-token cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'user@example.com', password: 'StrongPass1!' })
        .expect(200);

      expect(response.headers['set-cookie']).toEqual(
        expect.arrayContaining([expect.stringContaining('refresh-token=refresh-token-value')]),
      );
      expect(response.body.response.accessToken).toBe('access-token-value');
    });

    it('reads auth user via getMe', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/get-me')
        .set('Authorization', 'Bearer token')
        .expect(200);

      expect(authService.getMe).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 101, email: 'e2e@example.com' }),
      );
    });

    it('refreshes the access token using cookie', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/refresh-token')
        .set('Cookie', ['refresh-token=refresh-token-value'])
        .expect(200);

      expect(authService.getRefreshToken).toHaveBeenCalledWith(
        expect.anything(),
        'refresh-token-value',
      );
    });

    it('protects authenticated auth endpoints', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/get-me').expect(403);
      expect(authService.getMe).not.toHaveBeenCalled();
    });

    it('updates profile details for authenticated users', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/auth/update-details')
        .set('Authorization', 'Bearer token')
        .send({ name: 'Updated User', location: 'Kolkata' })
        .expect(200);

      expect(authService.updateUserDetails).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 101 }),
        { name: 'Updated User', location: 'Kolkata' },
      );
    });

    it('updates profile picture for authenticated users', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/change-profile-picture')
        .set('Authorization', 'Bearer token')
        .attach('file', Buffer.from('avatar'), 'avatar.png')
        .expect(200);

      expect(authService.updateProfilePicture).toHaveBeenCalledWith(
        expect.objectContaining({ originalname: 'avatar.png' }),
        expect.objectContaining({ userId: 101 }),
      );
    });

    it('supports verification, password reset, and logout flows', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/resend-verification-mail')
        .send({ email: 'user@example.com' })
        .expect(200);
      const verifyResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-mail')
        .send({ email: 'user@example.com', otp: '123456' })
        .expect(200);

      expect(verifyResponse.headers['set-cookie']).toEqual(
        expect.arrayContaining([expect.stringContaining('refresh-token=refresh-token-value')]),
      );
      expect(verifyResponse.body.response.accessToken).toBe('access-token-value');
      expect(verifyResponse.body.response.user).toEqual({ id: 1, email: 'user@example.com' });
      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'user@example.com' })
        .expect(200);
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ email: 'user@example.com', otp: '123456', password: 'NewStrong1!' })
        .expect(200);
      await request(app.getHttpServer())
        .get('/api/v1/auth/logout')
        .set('Cookie', ['refresh-token=refresh-token-value'])
        .expect(200);
    });
  });

  describe('links', () => {
    it('creates a shortened link', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/links')
        .set('Authorization', 'Bearer token')
        .send({ originalUrl: 'https://example.com', customAlias: 'docs' })
        .expect(201);

      expect(linksService.createLink).toHaveBeenCalledWith(
        { originalUrl: 'https://example.com', customAlias: 'docs' },
        101,
      );
    });

    it('lists links for the authenticated user', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/links')
        .query({ page: 2, limit: 5, search: 'abc', 'filters[status]': 'ACTIVE' })
        .set('Authorization', 'Bearer token')
        .expect(200);

      expect(linksService.getLinks).toHaveBeenCalledWith(
        101,
        2,
        5,
        [{ clause: 'link.status = :status', param: { status: LinkStatus.ACTIVE } }],
        'abc',
      );
    });

    it('reads a specific link by id', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/links/10')
        .set('Authorization', 'Bearer token')
        .expect(200);

      expect(linksService.getLinkById).toHaveBeenCalledWith(10, 101);
    });

    it('updates a link by id', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/links/10')
        .set('Authorization', 'Bearer token')
        .send({ status: LinkStatus.INACTIVE })
        .expect(200);

      expect(linksService.updateLink).toHaveBeenCalledWith(
        10,
        { status: LinkStatus.INACTIVE },
        101,
      );
    });

    it('deletes a link by id', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/links/10')
        .set('Authorization', 'Bearer token')
        .expect(200);

      expect(linksService.deleteLink).toHaveBeenCalledWith(10, 101);
    });

    it('rejects invalid link payloads, params, filters, and missing auth', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/links')
        .set('Authorization', 'Bearer token')
        .send({ originalUrl: 'example.com' })
        .expect(400);
      await request(app.getHttpServer())
        .get('/api/v1/links/not-a-number')
        .set('Authorization', 'Bearer token')
        .expect(400);
      await request(app.getHttpServer())
        .get('/api/v1/links')
        .query({ 'filters[unknown]': 'ACTIVE' })
        .set('Authorization', 'Bearer token')
        .expect(400);
      await request(app.getHttpServer()).get('/api/v1/links').expect(403);
    });
  });

  describe('analytics and QR', () => {
    it('returns dashboard analytics', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', 'Bearer token')
        .expect(200);

      expect(analyticsService.getDashboardAnalytics).toHaveBeenCalledWith(101);
    });

    it('returns per-link analytics', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/analytics/10')
        .set('Authorization', 'Bearer token')
        .expect(200);

      expect(analyticsService.getLinkAnalytics).toHaveBeenCalledWith(10, 101);
    });

    it('generates QR image responses and download headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/links/10/qrcode?download=true')
        .set('Authorization', 'Bearer token')
        .expect(200);

      expect(response.headers['content-type']).toBe('image/png');
      expect(response.headers['content-disposition']).toBe(
        'attachment; filename="qrcode-abc123.png"',
      );
      expect(qrService.generateQrCodeBuffer).toHaveBeenCalledWith('https://sho.rt/abc123');
    });
  });

  describe('redirects', () => {
    it('keeps short-link redirects outside the API prefix', async () => {
      await request(app.getHttpServer())
        .get('/abc123')
        .expect(302)
        .expect('Location', 'https://example.com');

      expect(redirectService.resolveRedirect).toHaveBeenCalledWith(
        'abc123',
        undefined,
        expect.anything(),
      );
    });

    it('renders password prompts, retry messages, and error pages', async () => {
      redirectService.resolveRedirect.mockResolvedValueOnce({ type: 'password_prompt' });
      const prompt = await request(app.getHttpServer()).get('/abc123').expect(200);
      expect(prompt.text).toContain('Password Required');

      redirectService.resolveRedirect.mockResolvedValueOnce({
        type: 'password_prompt',
        isRetry: true,
      });
      const retry = await request(app.getHttpServer()).get('/abc123?retry=true').expect(200);
      expect(retry.text).toContain('Incorrect password');

      redirectService.resolveRedirect.mockResolvedValueOnce({
        type: 'error',
        errorTitle: 'Expired Link',
        errorDescription: 'This link has expired.',
        statusCode: 410,
      });
      const error = await request(app.getHttpServer()).get('/abc123').expect(410);
      expect(error.text).toContain('Expired Link');
    });

    it('unlocks protected links and retries failed passwords', async () => {
      await request(app.getHttpServer())
        .post('/abc123/unlock')
        .type('form')
        .send({ password: 'secret' })
        .expect(302)
        .expect('Location', '/abc123?token=unlock-token');

      redirectService.unlockLink.mockResolvedValueOnce(null);
      await request(app.getHttpServer())
        .post('/abc123/unlock')
        .type('form')
        .send({ password: 'wrong' })
        .expect(302)
        .expect('Location', '/abc123?retry=true');

      expect(redirectService.unlockLink).toHaveBeenCalledWith('abc123', 'secret');
    });
  });

  describe('admin users', () => {
    it('requires a super-admin role', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', 'Bearer token')
        .expect(403);
    });

    it('lists, reads, and updates users for super admins', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/users?filters[role]=USER&filters[isEmailVerified]=true')
        .set('Authorization', 'Bearer token')
        .set('x-e2e-role', UserRole.SUPER_ADMIN)
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/v1/admin/users/1')
        .set('Authorization', 'Bearer token')
        .set('x-e2e-role', UserRole.SUPER_ADMIN)
        .expect(200);

      await request(app.getHttpServer())
        .patch('/api/v1/admin/users/1/status')
        .set('Authorization', 'Bearer token')
        .set('x-e2e-role', UserRole.SUPER_ADMIN)
        .send({ status: UserStatus.INACTIVE })
        .expect(200);

      expect(userSuperAdminService.getUsers).toHaveBeenCalledWith(
        1,
        10,
        [
          { clause: 'user.role = :role', param: { role: UserRole.USER } },
          { clause: 'user.isEmailVerified = :isEmailVerified', param: { isEmailVerified: true } },
        ],
        undefined,
      );
      expect(userSuperAdminService.getUserById).toHaveBeenCalledWith(1);
      expect(userSuperAdminService.updateUserStatus).toHaveBeenCalledWith(1, UserStatus.INACTIVE);
    });

    it('rejects invalid admin filters and statuses', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/users?filters[unknown]=USER')
        .set('Authorization', 'Bearer token')
        .set('x-e2e-role', UserRole.SUPER_ADMIN)
        .expect(400);

      await request(app.getHttpServer())
        .patch('/api/v1/admin/users/1/status')
        .set('Authorization', 'Bearer token')
        .set('x-e2e-role', UserRole.SUPER_ADMIN)
        .send({ status: 'BLOCKED' })
        .expect(400);
    });
  });

  describe('health and metrics', () => {
    it('exposes health and metrics outside the API prefix', async () => {
      const healthResponse = await request(app.getHttpServer()).get('/health').expect(200);

      expect(healthResponse.body.status).toBe('ok');
      expect(healthResponse.body.info.database.status).toBe('up');

      const metricsResponse = await request(app.getHttpServer()).get('/metrics').expect(200);
      expect(metricsResponse.text).toBeDefined();
    });
  });
});
