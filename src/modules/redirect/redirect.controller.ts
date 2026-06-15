import { Controller, Get, Post, Body, Param, Query, Req, Res } from '@nestjs/common';
import { type Request, type Response } from 'express';
import { RedirectService } from './redirect.service';

@Controller()
export class RedirectController {
  constructor(private readonly redirectService: RedirectService) {}

  @Get(':shortCode')
  async handleRedirect(
    @Param('shortCode') shortCode: string,
    @Query('token') tokenQuery: string,
    @Query('retry') retryQuery: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.redirectService.resolveRedirect(shortCode, tokenQuery, req);

    if (result.type === 'redirect') {
      return res.redirect(302, result.url || '');
    }

    if (result.type === 'password_prompt') {
      const isRetry = result.isRetry || retryQuery === 'true';
      return this.renderPasswordPrompt(res, shortCode, isRetry);
    }

    if (result.type === 'error') {
      return this.renderErrorPage(
        res,
        result.errorTitle || 'Error',
        result.errorDescription || 'An error occurred.',
        result.statusCode || 500,
      );
    }
  }

  @Post(':shortCode/unlock')
  async handleUnlock(
    @Param('shortCode') shortCode: string,
    @Body('password') passwordBody: string,
    @Res() res: Response,
  ) {
    const result = await this.redirectService.unlockLink(shortCode, passwordBody);
    if (result && result.token) {
      return res.redirect(302, `/${shortCode}?token=${result.token}`);
    }
    return res.redirect(302, `/${shortCode}?retry=true`);
  }

  /**
   * Serve a glassmorphic password entry page if link is protected.
   */
  private renderPasswordPrompt(res: Response, shortCode: string, isRetry: boolean) {
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
          
          <form action="/${shortCode}/unlock" method="POST">
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
