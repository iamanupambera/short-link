import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isIP } from 'net';
import { randomInt } from 'crypto';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { Link, LinkStatus } from './entities/link.entity';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcrypt';
import { PaginationResponse, FilterModifier } from 'src/common/interfaces';
import { LinksRepository } from './repository/links.repository';

@Injectable()
export class LinksService {
  constructor(
    private readonly linkRepository: LinksRepository,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a shortened link.
   */
  async createLink(dto: CreateLinkDto, userId: number): Promise<Link> {
    this.validateDestinationUrl(dto.originalUrl);
    let shortCode = '';

    if (dto.customAlias) {
      // Validate custom alias is alphanumeric or dash/underscore
      const cleanAlias = dto.customAlias.trim();
      if (!/^[a-zA-Z0-9-_]+$/.test(cleanAlias)) {
        throw new ConflictException('Custom alias contains invalid characters');
      }

      // Check conflict
      const conflict = await this.linkRepository.findLinkByCode(cleanAlias);

      if (conflict) {
        throw new ConflictException('Custom alias is already in use');
      }

      shortCode = cleanAlias;
    } else {
      // Generate unique short code
      shortCode = await this.generateUniqueShortCode();
    }

    let passwordHash: string | null = null;
    if (dto.password) {
      const saltRounds = parseInt(this.configService.getOrThrow<string>('BCRYPT_SALT_ROUNDS'), 10);
      passwordHash = await hash(dto.password, saltRounds);
    }

    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    const savedLink = await this.saveLinkWithCollisionRetry({
      userId,
      originalUrl: dto.originalUrl,
      shortCode,
      customAlias: dto.customAlias || null,
      passwordHash,
      expiresAt,
      status: LinkStatus.ACTIVE,
    });

    return savedLink;
  }

  /**
   * Get all links for user.
   */
  async getLinks(
    userId: number,
    page: number = 1,
    limit: number = 10,
    filters: FilterModifier[] = [],
    search?: string,
  ): Promise<PaginationResponse<Link>> {
    const [data, total] = await this.linkRepository.findAndCountAll(
      userId,
      page,
      limit,
      [],
      filters,
      search,
    );

    return {
      data,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  /**
   * Get link by ID.
   */
  async getLinkById(id: number, userId: number): Promise<Link> {
    const link = await this.linkRepository.findLinkById(id, userId);

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    return link;
  }

  /**
   * Update an existing link.
   */
  async updateLink(id: number, dto: UpdateLinkDto, userId: number): Promise<Link> {
    const link = await this.getLinkById(id, userId);
    const oldShortCode = link.shortCode;

    if (dto.originalUrl) {
      this.validateDestinationUrl(dto.originalUrl);
      link.originalUrl = dto.originalUrl;
    }

    if (dto.customAlias) {
      const cleanAlias = dto.customAlias.trim();
      if (!/^[a-zA-Z0-9-_]+$/.test(cleanAlias)) {
        throw new ConflictException('Custom alias contains invalid characters');
      }

      // Check conflict with other links
      const conflict = await this.linkRepository.findLinkByCode(cleanAlias);

      if (conflict && conflict.id !== link.id) {
        throw new ConflictException('Custom alias is already in use');
      }

      link.customAlias = cleanAlias;
      link.shortCode = cleanAlias;
    } else {
      // Clearing custom alias means generating a new random code
      if (link.customAlias) {
        link.customAlias = null;
        link.shortCode = await this.generateUniqueShortCode();
      }
    }

    if (dto.password) {
      const saltRounds = parseInt(this.configService.getOrThrow<string>('BCRYPT_SALT_ROUNDS'), 10);
      link.passwordHash = await hash(dto.password, saltRounds);
    } else {
      link.passwordHash = null;
    }

    if (dto.expiresAt !== undefined) {
      link.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }

    if (dto.status !== undefined) {
      link.status = dto.status;
    }

    // Evict old cache
    await this.redis.del(`short:${oldShortCode}`);

    let updatedLink: Link;
    try {
      updatedLink = await this.linkRepository.save(link);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Short code or custom alias is already in use');
      }
      throw error;
    }

    return updatedLink;
  }

  /**
   * Delete a link.
   */
  async deleteLink(id: number, userId: number): Promise<void> {
    const link = await this.getLinkById(id, userId);

    // Evict from cache
    await this.redis.del(`short:${link.shortCode}`);

    // Remove from DB
    await this.linkRepository.remove(link);
  }

  /**
   * Cache link in Redis for 24 Hours.
   */
  async cacheLink(link: Link): Promise<void> {
    const key = `short:${link.shortCode}`;
    const data = JSON.stringify({
      id: link.id,
      userId: link.userId,
      shortCode: link.shortCode,
      originalUrl: link.originalUrl,
      customAlias: link.customAlias,
      passwordHash: link.passwordHash,
      expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
      status: link.status,
    });
    // 24 Hour TTL = 86400 seconds
    await this.redis.set(key, data, 'EX', 86400);
  }

  /**
   * Generate a unique 6-character alphanumeric short code.
   */
  private async generateUniqueShortCode(): Promise<string> {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      attempts++;
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(randomInt(chars.length));
      }

      // Check conflict in DB or cache
      const cacheHit = await this.redis.exists(`short:${code}`);
      if (!cacheHit) {
        const dbHit = await this.linkRepository.findLinkByCode(code);
        if (!dbHit) {
          isUnique = true;
        }
      }
    }

    if (!isUnique) {
      code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(randomInt(chars.length));
      }
    }

    return code;
  }

  private async saveLinkWithCollisionRetry(data: Partial<Link>): Promise<Link> {
    const maxAttempts = data.customAlias ? 1 : 5;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const link = this.linkRepository.create({
        ...data,
        shortCode: attempt === 0 ? data.shortCode : await this.generateUniqueShortCode(),
      });

      try {
        return await this.linkRepository.save(link);
      } catch (error) {
        if (!this.isDuplicateKeyError(error)) {
          throw error;
        }

        if (data.customAlias || attempt === maxAttempts - 1) {
          throw new ConflictException('Short code or custom alias is already in use');
        }
      }
    }

    throw new ConflictException('Unable to generate a unique short code');
  }

  private validateDestinationUrl(value: string): void {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new BadRequestException('Original URL is invalid');
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new BadRequestException('Original URL must use http or https');
    }

    const hostname = url.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === 'localhost.localdomain' ||
      hostname.endsWith('.localhost') ||
      this.isPrivateIp(hostname)
    ) {
      throw new BadRequestException('Original URL cannot target a local or private address');
    }
  }

  private isPrivateIp(hostname: string): boolean {
    if (!isIP(hostname)) {
      return false;
    }

    if (hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
      return true;
    }

    if (hostname.startsWith('10.') || hostname.startsWith('192.168.')) {
      return true;
    }

    const parts = hostname.split('.').map(Number);
    if (parts.length === 4) {
      const [first, second] = parts;
      return first === 172 && second >= 16 && second <= 31;
    }

    const normalized = hostname.replace(/^\[|\]$/g, '');
    return (
      normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:')
    );
  }

  private isDuplicateKeyError(error: unknown): boolean {
    const maybeError = error as { code?: string; errno?: number };
    return maybeError.code === 'ER_DUP_ENTRY' || maybeError.errno === 1062;
  }
}
