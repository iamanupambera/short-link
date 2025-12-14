import { Injectable, Logger } from '@nestjs/common';
import renderEmail from './renderEmail';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { MessagingService } from './messaging.service';

@Injectable()
export class EmailService implements MessagingService {
  private readonly logger = new Logger(EmailService.name, { timestamp: true });

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendVerificationMessage(data: { receiverId: string; otp: string; name: string }) {
    const html = await renderEmail('VerifyEmail', {
      otp: data.otp,
      clientUrl: this.configService.getOrThrow('CLIENT_URL'),
      email: data.receiverId,
      apiUrl: this.configService.getOrThrow('API_URL'),
      name: data.name,
    });

    try {
      await this.mailerService.sendMail({
        to: data.receiverId,
        subject: 'Verify Your Email',
        html,
      });

      return true;
    } catch (err) {
      this.logger.error(err);
      return false;
    }
  }

  async sendResetPasswordOtp(data: {
    receiverId: string;
    otp: string;
    language: string;
    name: string;
  }): Promise<boolean> {
    const html = await renderEmail('ResetPasswordOtp', {
      language: data.language,
      otp: data.otp,
      apiUrl: this.configService.getOrThrow('API_URL'),
      name: data.name,
    });

    try {
      await this.mailerService.sendMail({
        to: data.receiverId,
        subject: 'Password reset otp received',
        html,
      });

      return true;
    } catch (err) {
      this.logger.error(err);
      return false;
    }
  }

  async sendWelcomeMessage(data: {
    receiverId: string;
    password: string;
    role: string;
    language: string;
    name: string;
  }): Promise<boolean> {
    const html = await renderEmail('WelcomeMail', {
      language: data.language,
      password: data.password,
      role: data.role,
      apiUrl: this.configService.getOrThrow('API_URL'),
      clientUrl: this.configService.getOrThrow('CLIENT_URL'),
      name: data.name,
    });

    try {
      await this.mailerService.sendMail({
        to: data.receiverId,
        subject: 'Welcome Email',
        html,
      });

      return true;
    } catch (err) {
      this.logger.error(err);
      return false;
    }
  }
}
