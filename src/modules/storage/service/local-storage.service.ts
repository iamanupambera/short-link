import { Injectable, Logger } from '@nestjs/common';
import {
  StorageService,
  UploadOptions,
  UploadedFileMetadata,
  FileMetadata,
} from '../interfaces/storage-service.interface';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { basename, extname, join, relative, resolve } from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LocalStorageService implements StorageService {
  constructor(private readonly configService: ConfigService) {}
  private readonly uploadRoot = resolve(__dirname, '../../../../public/uploads');

  private readonly logger = new Logger(LocalStorageService.name);

  async uploadFile(
    file: Express.Multer.File,
    options?: UploadOptions,
  ): Promise<UploadedFileMetadata> {
    const fileId = uuidv4();
    const filename = fileId + extname(file.originalname);
    const subPath = options?.path ?? '';
    const destFolder = join(this.uploadRoot, subPath);
    const destPath = join(destFolder, filename);

    await fs.mkdir(destFolder, { recursive: true });
    await fs.writeFile(destPath, file.buffer);

    const relPath = relative(this.uploadRoot, destPath);
    return {
      path: relPath.replace(/\\/g, '/'),
      url: `${this.configService.getOrThrow('API_URL')}/uploads/${relPath.replace(/\\/g, '/')}`,
      metadata: options?.metadata ?? {},
    };
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = join(this.uploadRoot, filePath);
    if (await this.fileExists(fullPath)) {
      await fs.unlink(fullPath);
    }
  }

  getPublicUrl(filePath: string): string {
    return `${this.configService.getOrThrow('API_URL')}/uploads/${filePath}`;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getSignedUrl(
    filePath: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    expiresInSeconds: number,
  ): Promise<string> {
    return this.getPublicUrl(filePath); // No signing needed for local
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(join(this.uploadRoot, filePath));
      return true;
    } catch (error) {
      this.logger.log('info', error);
      return false;
    }
  }

  async getMetadata(filePath: string): Promise<FileMetadata> {
    const fullPath = join(this.uploadRoot, filePath);
    const stat = await fs.stat(fullPath);
    const ext = extname(filePath);

    return {
      size: stat.size,
      mimeType: ext,
      originalName: basename(filePath),
      metadata: {},
    };
  }
}
