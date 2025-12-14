export interface UploadOptions {
  path?: string;
  metadata?: object;
  isPublic?: boolean;
}

export interface UploadedFileMetadata {
  path: string;
  url: string;
  metadata?: object;
}

export interface FileMetadata {
  size: number;
  mimeType: string;
  originalName: string;
  metadata?: object;
}

export interface StorageService {
  uploadFile(file: Express.Multer.File, options?: UploadOptions): Promise<UploadedFileMetadata>;
  deleteFile(path: string): Promise<void>;
  getPublicUrl(path: string): string;
  getSignedUrl(path: string, expiresInSeconds: number): Promise<string>;
  fileExists(path: string): Promise<boolean>;
  getMetadata(path: string): Promise<FileMetadata>;
}
