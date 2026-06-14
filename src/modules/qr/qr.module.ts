import { Module } from '@nestjs/common';
import { QrService } from './qr.service';
import { QrController } from './qr.controller';
import { LinksModule } from '../links/links.module';

@Module({
  imports: [LinksModule],
  providers: [QrService],
  controllers: [QrController],
})
export class QrModule {}
