import { Test, TestingModule } from '@nestjs/testing';
import { QrController } from './qr.controller';
import { QrService } from './qr.service';
import { LinksService } from '../links/links.service';
import { ConfigService } from '@nestjs/config';
import { type Response } from 'express';
import { UserRole } from '../auth/entities/user.entity';

describe('QrController', () => {
  let controller: QrController;
  let mockQrService: any;
  let mockLinksService: any;
  let mockConfigService: any;
  let mockResponse: any;

  beforeEach(async () => {
    mockQrService = {
      generateQrCodeBuffer: jest.fn(),
    };
    mockLinksService = {
      getLinkById: jest.fn(),
    };
    mockConfigService = {
      getOrThrow: jest.fn(),
    };

    mockResponse = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QrController],
      providers: [
        { provide: QrService, useValue: mockQrService },
        { provide: LinksService, useValue: mockLinksService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<QrController>(QrController);
  });

  it('should generate and return QR code buffer (inline display)', async () => {
    const mockLink = { id: 1, shortCode: 'abc' };
    const mockBuffer = Buffer.from('mock-qr-code');
    const user = {
      userId: 10,
      email: 'test@test.com',
      role: UserRole.USER,
      isVerified: true,
      sessionKey: '',
    };

    mockLinksService.getLinkById.mockResolvedValue(mockLink);
    mockConfigService.getOrThrow.mockReturnValue('http://api.com');
    mockQrService.generateQrCodeBuffer.mockResolvedValue(mockBuffer);

    await controller.getQrCode(1, 'false', user, mockResponse as Response);

    expect(mockLinksService.getLinkById).toHaveBeenCalledWith(1, 10);
    expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('API_URL');
    expect(mockQrService.generateQrCodeBuffer).toHaveBeenCalledWith('http://api.com/abc');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
    expect(mockResponse.setHeader).not.toHaveBeenCalledWith(
      'Content-Disposition',
      expect.any(String),
    );
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.send).toHaveBeenCalledWith(mockBuffer);
  });

  it('should generate and return QR code buffer as download attachment when download is true', async () => {
    const mockLink = { id: 1, shortCode: 'abc' };
    const mockBuffer = Buffer.from('mock-qr-code');
    const user = {
      userId: 10,
      email: 'test@test.com',
      role: UserRole.USER,
      isVerified: true,
      sessionKey: '',
    };

    mockLinksService.getLinkById.mockResolvedValue(mockLink);
    mockConfigService.getOrThrow.mockReturnValue('http://api.com');
    mockQrService.generateQrCodeBuffer.mockResolvedValue(mockBuffer);

    await controller.getQrCode(1, 'true', user, mockResponse as Response);

    expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="qrcode-abc.png"',
    );
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.send).toHaveBeenCalledWith(mockBuffer);
  });
});
