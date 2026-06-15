import { validateUploadedFile } from './file-validation.util';
import { BadRequestException } from '@nestjs/common';

describe('file-validation.util', () => {
  const allowedMimeTypes = ['image/jpeg', 'image/png'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png'];
  const maxSizeBytes = 1024 * 1024; // 1MB

  it('should validate successfully for a valid PNG file', () => {
    const mockFile = {
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01]),
      size: 6,
      originalname: 'avatar.png',
      mimetype: 'image/png',
    } as Express.Multer.File;

    expect(() =>
      validateUploadedFile(mockFile, { maxSizeBytes, allowedMimeTypes, allowedExtensions }),
    ).not.toThrow();
  });

  it('should validate successfully for a valid JPEG file', () => {
    const mockFile = {
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x01]),
      size: 6,
      originalname: 'avatar.jpg',
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    expect(() =>
      validateUploadedFile(mockFile, { maxSizeBytes, allowedMimeTypes, allowedExtensions }),
    ).not.toThrow();
  });

  it('should throw BadRequestException if file is larger than limit', () => {
    const mockFile = {
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      size: 2 * 1024 * 1024,
      originalname: 'avatar.png',
      mimetype: 'image/png',
    } as Express.Multer.File;

    expect(() =>
      validateUploadedFile(mockFile, { maxSizeBytes, allowedMimeTypes, allowedExtensions }),
    ).toThrow(BadRequestException);
  });

  it('should throw BadRequestException for disallowed extension', () => {
    const mockFile = {
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      size: 4,
      originalname: 'avatar.exe',
      mimetype: 'image/png',
    } as Express.Multer.File;

    expect(() =>
      validateUploadedFile(mockFile, { maxSizeBytes, allowedMimeTypes, allowedExtensions }),
    ).toThrow(BadRequestException);
  });

  it('should throw BadRequestException for disallowed mime type', () => {
    const mockFile = {
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      size: 4,
      originalname: 'avatar.png',
      mimetype: 'application/octet-stream',
    } as Express.Multer.File;

    expect(() =>
      validateUploadedFile(mockFile, { maxSizeBytes, allowedMimeTypes, allowedExtensions }),
    ).toThrow(BadRequestException);
  });

  it('should throw BadRequestException if magic bytes do not match expected signature', () => {
    const mockFile = {
      buffer: Buffer.from([0x00, 0x00, 0x00, 0x00]),
      size: 4,
      originalname: 'avatar.png',
      mimetype: 'image/png',
    } as Express.Multer.File;

    expect(() =>
      validateUploadedFile(mockFile, { maxSizeBytes, allowedMimeTypes, allowedExtensions }),
    ).toThrow(BadRequestException);
  });
});
