import { Test, TestingModule } from '@nestjs/testing';
import { LocalStorageService } from './local-storage.service';
import { ConfigService } from '@nestjs/config';
import fs from 'fs/promises';

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
  access: jest.fn(),
  stat: jest.fn(),
}));

describe('LocalStorageService', () => {
  let service: LocalStorageService;
  let mockConfigService: any;

  beforeEach(async () => {
    mockConfigService = {
      getOrThrow: jest.fn().mockReturnValue('http://localhost:3000'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [LocalStorageService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<LocalStorageService>(LocalStorageService);
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    it('should upload a file and return metadata with path and url', async () => {
      const mockFile = {
        originalname: 'test.jpg',
        buffer: Buffer.from('hello-world'),
      } as Express.Multer.File;

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.uploadFile(mockFile, {
        path: 'avatars',
        metadata: { custom: 'info' },
      });

      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
      expect(result.path).toContain('avatars/');
      expect(result.path).toContain('.jpg');
      expect(result.url).toContain('http://localhost:3000/uploads/avatars/');
      expect(result.metadata).toEqual({ custom: 'info' });
    });

    it('should handle upload file without options', async () => {
      const mockFile = {
        originalname: 'document.pdf',
        buffer: Buffer.from('pdf-data'),
      } as Express.Multer.File;

      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await service.uploadFile(mockFile);

      expect(result.path).not.toContain('avatars/');
      expect(result.path).toContain('.pdf');
      expect(result.metadata).toEqual({});
    });
  });

  describe('deleteFile', () => {
    it('should delete file if it exists', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      await service.deleteFile('some-file.txt');

      expect(fs.access).toHaveBeenCalled();
      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should not delete file if it does not exist', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('File not found'));
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      await service.deleteFile('non-existent.txt');

      expect(fs.access).toHaveBeenCalled();
      expect(fs.unlink).not.toHaveBeenCalled();
    });
  });

  describe('getPublicUrl', () => {
    it('should return the correct public url', () => {
      const url = service.getPublicUrl('test-folder/image.png');
      expect(url).toBe('http://localhost:3000/uploads/test-folder/image.png');
    });
  });

  describe('getSignedUrl', () => {
    it('should log and return public url (fallback for local storage)', async () => {
      const url = await service.getSignedUrl('folder/doc.pdf', 3600);
      expect(url).toBe('http://localhost:3000/uploads/folder/doc.pdf');
    });
  });

  describe('fileExists', () => {
    it('should return true if file is accessible', async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
      const exists = await service.fileExists('file.txt');
      expect(exists).toBe(true);
    });

    it('should return false and log if file is not accessible', async () => {
      (fs.access as jest.Mock).mockRejectedValue(new Error('Access Denied'));
      const exists = await service.fileExists('file.txt');
      expect(exists).toBe(false);
    });
  });

  describe('getMetadata', () => {
    it('should return file statistics', async () => {
      const mockStat = { size: 12345 };
      (fs.stat as jest.Mock).mockResolvedValue(mockStat);

      const metadata = await service.getMetadata('uploads/image.png');

      expect(fs.stat).toHaveBeenCalled();
      expect(metadata).toEqual({
        size: 12345,
        mimeType: '.png',
        originalName: 'image.png',
        metadata: {},
      });
    });
  });
});
