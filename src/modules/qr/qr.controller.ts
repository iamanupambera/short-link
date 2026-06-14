import { Controller, Get, Param, Query, Res, UseGuards, ParseIntPipe } from '@nestjs/common';
import { QrService } from './qr.service';
import { LinksService } from '../links/links.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AuthUser } from 'src/common/decorator/auth-user.decorator';
import { type AuthUserInterface } from 'src/common/interfaces';
import { ConfigService } from '@nestjs/config';
import { type Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse as SwaggerResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('QR Code')
@Controller('links')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QrController {
  constructor(
    private readonly qrService: QrService,
    private readonly linksService: LinksService,
    private readonly configService: ConfigService,
  ) {}

  @Get(':id/qrcode')
  @ApiOperation({ summary: 'Generate QR code for a short link' })
  @ApiQuery({ name: 'download', required: false, type: Boolean })
  @SwaggerResponse({ status: 200, description: 'QR Code image returned.' })
  async getQrCode(
    @Param('id', ParseIntPipe) id: number,
    @Query('download') download: string,
    @AuthUser() user: AuthUserInterface,
    @Res() res: Response,
  ) {
    const link = await this.linksService.getLinkById(id, user.userId);
    const apiUrl = this.configService.getOrThrow<string>('API_URL');
    const shortUrl = `${apiUrl}/${link.shortCode}`;

    const qrBuffer = await this.qrService.generateQrCodeBuffer(shortUrl);

    res.setHeader('Content-Type', 'image/png');

    if (download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="qrcode-${link.shortCode}.png"`);
    }

    return res.status(200).send(qrBuffer);
  }
}
