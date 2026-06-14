import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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

    const link = this.linkRepository.create({
      userId,
      originalUrl: dto.originalUrl,
      shortCode,
      customAlias: dto.customAlias || null,
      passwordHash,
      expiresAt,
      status: LinkStatus.ACTIVE,
    });

    const savedLink = await this.linkRepository.save(link);

    // Cache the short URL details in Redis for 24 Hours
    await this.cacheLink(savedLink);

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
      link.originalUrl = dto.originalUrl;
    }

    if (dto.customAlias !== undefined) {
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
    }

    if (dto.password !== undefined) {
      if (dto.password) {
        const saltRounds = parseInt(
          this.configService.getOrThrow<string>('BCRYPT_SALT_ROUNDS'),
          10,
        );
        link.passwordHash = await hash(dto.password, saltRounds);
      } else {
        link.passwordHash = null;
      }
    }

    if (dto.expiresAt !== undefined) {
      link.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }

    if (dto.status !== undefined) {
      link.status = dto.status;
    }

    const updatedLink = await this.linkRepository.save(link);

    // Evict old cache
    await this.redis.del(`short:${oldShortCode}`);

    // Cache updated link
    await this.cacheLink(updatedLink);

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
        code += chars.charAt(Math.floor(Math.random() * chars.length));
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
      // Fallback with timestamp hashing to guarantee uniqueness
      code = Date.now().toString(36).slice(-6);
    }

    return code;
  }
}
