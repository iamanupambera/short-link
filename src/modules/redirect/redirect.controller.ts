import { Controller, Get, Param, Query, Req, Res, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { QueueService } from '../redis/queue.service';
import { Link, LinkStatus } from '../links/entities/link.entity';
import { type Request, type Response } from 'express';
import { compare } from 'bcrypt';
import { LinksRepository } from '../links/repository/links.repository';

@Controller()
export class RedirectController {
  constructor(
    private readonly linkRepository: LinksRepository,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly queueService: QueueService,
  ) {}

  @Get(':shortCode')
  async handleRedirect(
    @Param('shortCode') shortCode: string,
    @Query('password') passwordQuery: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const cacheKey = `short:${shortCode}`;
    let linkData: Partial<Link> | null = null;

    // 1. Try Cache Lookup
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        linkData = JSON.parse(cached) as Partial<Link>;
      } catch {
        linkData = null;
      }
    }

    // 2. Try DB Lookup if not cached
    if (!linkData) {
      const link = await this.linkRepository.findLinkByCode(shortCode);

      if (!link) {
        return this.renderErrorPage(
          res,
          'Link Not Found',
          'The link you are trying to access does not exist or has been deleted.',
          404,
        );
      }

      linkData = {
        id: link.id,
        userId: link.userId,
        shortCode: link.shortCode,
        originalUrl: link.originalUrl,
        customAlias: link.customAlias,
        passwordHash: link.passwordHash,
        expiresAt: link.expiresAt ? link.expiresAt : null,
        status: link.status,
      };

      // Cache it for 24 hours
      await this.redis.set(cacheKey, JSON.stringify(linkData), 'EX', 86400);
    }

    // 3. Validate Link Status
    if (linkData?.status === LinkStatus.INACTIVE) {
      return this.renderErrorPage(
        res,
        'Link Inactive',
        'This short link is currently inactive.',
        403,
      );
    }

    // 4. Validate Expiration
    if (linkData?.expiresAt) {
      const expiry = new Date(linkData.expiresAt);
      if (expiry.getTime() < Date.now()) {
        return this.renderErrorPage(res, 'Link Expired', 'This short link has expired.', 410);
      }
    }

    // 5. Validate Password Protection
    if (linkData?.passwordHash) {
      if (!passwordQuery) {
        return this.renderPasswordPrompt(res, false);
      }

      const isPasswordCorrect = await compare(passwordQuery, linkData.passwordHash);
      if (!isPasswordCorrect) {
        return this.renderPasswordPrompt(res, true);
      }
    }

    // 6. Queue Click Analytics Event Asynchronously
    // Retrieve IP (taking into account proxies)
    const xForwardedFor = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor) ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    const cleanIp = ip.split(',')[0].trim();

    const cfIpCountry = req.headers['cf-ipcountry'];
    const xCountryCode = req.headers['x-country-code'];
    const country =
      (Array.isArray(cfIpCountry) ? cfIpCountry[0] : cfIpCountry) ||
      (Array.isArray(xCountryCode) ? xCountryCode[0] : xCountryCode) ||
      '';

    const clickEvent = {
      linkId: linkData?.id,
      ip: cleanIp,
      userAgent: req.headers['user-agent'] || '',
      referrer: req.headers['referer'] || '',
      country,
      timestamp: new Date().toISOString(),
    };

    // Push click details to Redis queue
    await this.queueService.push('analytics_clicks_queue', clickEvent);

    // 7. Perform Redirect
    return res.redirect(302, linkData?.originalUrl || '');
  }

  /**
   * Serve a glassmorphic password entry page if link is protected.
   */
  private renderPasswordPrompt(res: Response, isRetry: boolean) {
    const errorHtml = isRetry
      ? `<div class="error-msg">Incorrect password. Please try again.</div>`
      : '';

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Protected Link - ShortLink</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Outfit', sans-serif;
          }
          body {
            background: radial-gradient(circle at 10% 20%, rgb(90, 8, 142) 0%, rgb(18, 18, 38) 90%);
            color: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            overflow: hidden;
          }
          .background-glow {
            position: absolute;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(144, 58, 255, 0.4) 0%, rgba(0,0,0,0) 70%);
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1;
            pointer-events: none;
          }
          .card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            padding: 40px;
            width: 90%;
            max-width: 440px;
            text-align: center;
            z-index: 2;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
            animation: fadeIn 0.8s ease-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .logo {
            font-weight: 800;
            font-size: 28px;
            background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
          }
          .tagline {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.6);
            margin-bottom: 32px;
          }
          h2 {
            font-size: 22px;
            font-weight: 600;
            margin-bottom: 12px;
          }
          p {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 24px;
            line-height: 1.5;
          }
          .form-group {
            position: relative;
            margin-bottom: 20px;
          }
          input[type="password"] {
            width: 100%;
            padding: 16px 20px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            color: #ffffff;
            font-size: 16px;
            outline: none;
            transition: all 0.3s ease;
          }
          input[type="password"]:focus {
            background: rgba(255, 255, 255, 0.15);
            border-color: #00f2fe;
            box-shadow: 0 0 12px rgba(0, 242, 254, 0.3);
          }
          button {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
            border: none;
            border-radius: 12px;
            color: #ffffff;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 242, 254, 0.2);
          }
          button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 242, 254, 0.4);
          }
          button:active {
            transform: translateY(0);
          }
          .error-msg {
            background: rgba(255, 76, 76, 0.15);
            border: 1px solid rgba(255, 76, 76, 0.3);
            border-radius: 12px;
            padding: 12px;
            color: #ff4c4c;
            font-size: 14px;
            margin-bottom: 20px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="background-glow"></div>
        <div class="card">
          <div class="logo">ShortLink</div>
          <div class="tagline">Shorten. Share. Track.</div>
          <h2>Password Required</h2>
          <p>This link is password-protected. Please enter the password to proceed.</p>
          
          ${errorHtml}
          
          <form action="" method="GET">
            <div class="form-group">
              <input type="password" name="password" placeholder="Enter password" autofocus required>
            </div>
            <button type="submit">Unlock & Redirect</button>
          </form>
        </div>
      </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  }

  /**
   * Serve a styled custom error page for inactive/expired/not found links.
   */
  private renderErrorPage(res: Response, title: string, description: string, statusCode: number) {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - ShortLink</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Outfit', sans-serif;
          }
          body {
            background: radial-gradient(circle at 10% 20%, rgb(90, 8, 142) 0%, rgb(18, 18, 38) 90%);
            color: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            overflow: hidden;
          }
          .background-glow {
            position: absolute;
            width: 450px;
            height: 450px;
            background: radial-gradient(circle, rgba(255, 76, 76, 0.2) 0%, rgba(0,0,0,0) 75%);
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1;
            pointer-events: none;
          }
          .card {
            background: rgba(255, 255, 255, 0.04);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            padding: 40px;
            width: 90%;
            max-width: 440px;
            text-align: center;
            z-index: 2;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.35);
          }
          .icon {
            font-size: 56px;
            margin-bottom: 20px;
          }
          .logo {
            font-weight: 800;
            font-size: 20px;
            background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 24px;
          }
          h2 {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 12px;
          }
          p {
            font-size: 15px;
            color: rgba(255, 255, 255, 0.65);
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="background-glow"></div>
        <div class="card">
          <div class="logo">ShortLink</div>
          <div class="icon">⚠️</div>
          <h2>${title}</h2>
          <p>${description}</p>
        </div>
      </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    return res.status(statusCode).send(html);
  }
}
