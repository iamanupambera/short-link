import { QrService } from './qr.service';
import * as QRCode from 'qrcode';

jest.mock('qrcode', () => ({
  toBuffer: jest.fn(),
}));

describe('QrService', () => {
  let service: QrService;

  beforeEach(() => {
    service = new QrService();
    jest.clearAllMocks();
  });

  it('should call QRCode.toBuffer with expected arguments', async () => {
    const mockBuffer = Buffer.from('mock-qr-code');
    (QRCode.toBuffer as jest.Mock).mockResolvedValue(mockBuffer);

    const result = await service.generateQrCodeBuffer('https://example.com');

    expect(result).toBe(mockBuffer);
    expect(QRCode.toBuffer).toHaveBeenCalledWith('https://example.com', {
      type: 'png',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  });
});
