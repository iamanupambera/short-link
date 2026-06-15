import { Test, TestingModule } from '@nestjs/testing';
import { RedirectController } from './redirect.controller';
import { RedirectService } from './redirect.service';

const mockRedirectService = {
  resolveRedirect: jest.fn(),
  unlockLink: jest.fn(),
};

describe('RedirectController', () => {
  let controller: RedirectController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RedirectController],
      providers: [{ provide: RedirectService, useValue: mockRedirectService }],
    }).compile();

    controller = module.get<RedirectController>(RedirectController);
    jest.clearAllMocks();
  });

  const mockReq = {
    headers: { 'user-agent': 'test', referer: '' },
    socket: { remoteAddress: '127.0.0.1' },
  } as any;

  function createMockRes() {
    return {
      redirect: jest.fn(),
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as any;
  }

  describe('handleRedirect', () => {
    it('should redirect when result type is "redirect"', async () => {
      const res = createMockRes();
      mockRedirectService.resolveRedirect.mockResolvedValue({
        type: 'redirect',
        url: 'https://example.com',
      });

      await controller.handleRedirect('abc', undefined as any, undefined as any, mockReq, res);
      expect(res.redirect).toHaveBeenCalledWith(302, 'https://example.com');
    });

    it('should render password prompt when result type is "password_prompt"', async () => {
      const res = createMockRes();
      mockRedirectService.resolveRedirect.mockResolvedValue({
        type: 'password_prompt',
        isRetry: false,
      });

      await controller.handleRedirect('abc', undefined as any, undefined as any, mockReq, res);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalled();
      // Verify the HTML contains the form
      const html = res.send.mock.calls[0][0];
      expect(html).toContain('Password Required');
      expect(html).not.toContain('Incorrect password');
    });

    it('should render password prompt with error on retry', async () => {
      const res = createMockRes();
      mockRedirectService.resolveRedirect.mockResolvedValue({
        type: 'password_prompt',
        isRetry: true,
      });

      await controller.handleRedirect('abc', undefined as any, undefined as any, mockReq, res);
      const html = res.send.mock.calls[0][0];
      expect(html).toContain('Incorrect password');
    });

    it('should render password prompt with retry from query param', async () => {
      const res = createMockRes();
      mockRedirectService.resolveRedirect.mockResolvedValue({
        type: 'password_prompt',
        isRetry: false,
      });

      await controller.handleRedirect('abc', undefined as any, 'true', mockReq, res);
      const html = res.send.mock.calls[0][0];
      expect(html).toContain('Incorrect password');
    });

    it('should render error page when result type is "error"', async () => {
      const res = createMockRes();
      mockRedirectService.resolveRedirect.mockResolvedValue({
        type: 'error',
        errorTitle: 'Link Not Found',
        errorDescription: 'The link does not exist.',
        statusCode: 404,
      });

      await controller.handleRedirect('abc', undefined as any, undefined as any, mockReq, res);
      expect(res.status).toHaveBeenCalledWith(404);
      const html = res.send.mock.calls[0][0];
      expect(html).toContain('Link Not Found');
    });

    it('should use defaults for missing error fields', async () => {
      const res = createMockRes();
      mockRedirectService.resolveRedirect.mockResolvedValue({
        type: 'error',
      });

      await controller.handleRedirect('abc', undefined as any, undefined as any, mockReq, res);
      expect(res.status).toHaveBeenCalledWith(500);
      const html = res.send.mock.calls[0][0];
      expect(html).toContain('Error');
    });
  });

  describe('handleUnlock', () => {
    it('should redirect with token on successful unlock', async () => {
      const res = createMockRes();
      mockRedirectService.unlockLink.mockResolvedValue({ token: 'unlock-token-123' });

      await controller.handleUnlock('abc', 'secret', res);
      expect(res.redirect).toHaveBeenCalledWith(302, '/abc?token=unlock-token-123');
    });

    it('should redirect with retry on failed unlock', async () => {
      const res = createMockRes();
      mockRedirectService.unlockLink.mockResolvedValue(null);

      await controller.handleUnlock('abc', 'wrong', res);
      expect(res.redirect).toHaveBeenCalledWith(302, '/abc?retry=true');
    });
  });
});
