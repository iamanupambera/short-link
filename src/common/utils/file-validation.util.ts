import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

export interface FileValidationOptions {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
}

export function validateUploadedFile(
  file: Express.Multer.File,
  options: FileValidationOptions,
): void {
  if (!file) {
    throw new BadRequestException('No file uploaded');
  }

  // 1. Size Check
  if (file.size > options.maxSizeBytes) {
    const sizeInMb = (options.maxSizeBytes / (1024 * 1024)).toFixed(1);
    throw new BadRequestException(`File size exceeds the limit of ${sizeInMb}MB`);
  }

  // 2. Extension Check
  const fileExt = extname(file.originalname).toLowerCase();
  if (!options.allowedExtensions.includes(fileExt)) {
    throw new BadRequestException(
      `Invalid file extension. Allowed extensions are: ${options.allowedExtensions.join(', ')}`,
    );
  }

  // 3. MIME Type Check (claimed)
  if (!options.allowedMimeTypes.includes(file.mimetype)) {
    throw new BadRequestException(
      `Invalid MIME type. Allowed MIME types are: ${options.allowedMimeTypes.join(', ')}`,
    );
  }

  // 4. Magic Bytes Validation
  const buffer = file.buffer;
  if (!buffer || buffer.length < 4) {
    throw new BadRequestException('Invalid or corrupted file content');
  }

  // Convert first 4 bytes to hex for comparison
  const hex = buffer.toString('hex', 0, 4).toUpperCase();
  let matchedMime = '';

  if (hex.startsWith('FFD8FF')) {
    matchedMime = 'image/jpeg';
  } else if (hex === '89504E47') {
    matchedMime = 'image/png';
  } else if (hex.startsWith('474946')) {
    matchedMime = 'image/gif';
  } else if (hex === '52494646') {
    if (buffer.length >= 12) {
      const webpSignature = buffer.toString('utf8', 8, 12);
      if (webpSignature === 'WEBP') {
        matchedMime = 'image/webp';
      }
    }
  }

  if (!matchedMime) {
    throw new BadRequestException(
      'File signature validation failed. The file content does not match a valid image type.',
    );
  }

  if (!options.allowedMimeTypes.includes(matchedMime)) {
    throw new BadRequestException(
      `The file content is detected as ${matchedMime}, which is not allowed.`,
    );
  }
}
