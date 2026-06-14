import { Injectable } from '@nestjs/common';
import { DataSource, Repository, Brackets } from 'typeorm';
import { Link } from '../entities/link.entity';
import { FilterModifier, Relation } from 'src/common/interfaces';

@Injectable()
export class LinksRepository extends Repository<Link> {
  constructor(readonly dataSource: DataSource) {
    super(Link, dataSource.createEntityManager());
  }

  async findLinkById(
    linkId: number,
    userId: number,
    relations: Relation[] = [],
  ): Promise<Link | null> {
    const qb = this.createQueryBuilder('link');

    relations.forEach((f) => {
      if (f.select && f.condition && f.parameters) {
        qb.leftJoinAndSelect(f.property, f.alias, f.condition, f.parameters);
      } else if (f.select) {
        qb.leftJoinAndSelect(f.property, f.alias);
      } else if (f.condition && f.parameters) {
        qb.leftJoin(f.property, f.alias, f.condition, f.parameters);
      } else {
        qb.leftJoin(f.property, f.alias);
      }
    });

    return qb
      .where('link.id = :linkId', { linkId })
      .andWhere('link.userId = :userId', { userId })
      .getOne();
  }

  async findLinkByCode(shortCode: string, relations: Relation[] = []): Promise<Link | null> {
    const qb = this.createQueryBuilder('link');

    relations.forEach((f) => {
      if (f.select && f.condition && f.parameters) {
        qb.leftJoinAndSelect(f.property, f.alias, f.condition, f.parameters);
      } else if (f.select) {
        qb.leftJoinAndSelect(f.property, f.alias);
      } else if (f.condition && f.parameters) {
        qb.leftJoin(f.property, f.alias, f.condition, f.parameters);
      } else {
        qb.leftJoin(f.property, f.alias);
      }
    });

    return qb
      .where('link.shortCode = :shortCode', { shortCode })
      .orWhere('link.customAlias = :shortCode', { shortCode })
      .getOne();
  }

  async findAndCountAll(
    userId: number,
    page: number,
    limit: number,
    relations: Relation[] = [],
    filters: FilterModifier[] = [],
    search?: string,
  ): Promise<[Link[], number]> {
    const qb = this.createQueryBuilder('link');

    relations.forEach((f) => {
      if (f.select && f.condition && f.parameters) {
        qb.leftJoinAndSelect(f.property, f.alias, f.condition, f.parameters);
      } else if (f.select) {
        qb.leftJoinAndSelect(f.property, f.alias);
      } else if (f.condition && f.parameters) {
        qb.leftJoin(f.property, f.alias, f.condition, f.parameters);
      } else {
        qb.leftJoin(f.property, f.alias);
      }
    });

    qb.where('link.userId = :userId', { userId });

    if (search) {
      qb.andWhere(
        new Brackets((qb) => {
          qb.where('link.originalUrl LIKE :search', { search: `%${search}%` })
            .orWhere('link.shortCode LIKE :search', { search: `%${search}%` })
            .orWhere('link.customAlias LIKE :search', { search: `%${search}%` });
        }),
      );
    }

    filters.forEach((f) => {
      qb.andWhere(f.clause, f.param);
    });

    return qb
      .orderBy('link.createdAt', 'DESC')
      .take(limit)
      .skip(limit * (page - 1))
      .getManyAndCount();
  }
}
