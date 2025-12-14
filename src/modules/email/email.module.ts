import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailService } from './email.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
// import { readFile } from 'fs/promises';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.getOrThrow<number>('MAIL_HOST'),
          port: Number(config.getOrThrow('MAIL_PORT')),
          secure: false,
          auth: {
            user: config.getOrThrow<string>('MAIL_USER'),
            pass: config.getOrThrow<string>('MAIL_PASSWORD'),
          },
          tls: {
            rejectUnauthorized: false,
            // ca: [await readFile(certFilePath)],
          },
        },
        defaults: {
          from: `"${config.getOrThrow('MAIL_FROM_NAME')}" <${config.getOrThrow('MAIL_FROM')}>`,
        },
      }),
    }),
  ],
  providers: [
    {
      provide: 'EMAIL_SERVICE',
      useClass: EmailService,
    },
  ],
  exports: ['EMAIL_SERVICE'],
})
export class EmailModule {}
