import { Injectable } from '@nestjs/common';
import { User } from '../entities/user.entity';
import { Brackets, DataSource, Repository } from 'typeorm';
import { UserPassword } from '../entities/user-password.entity';
import { FilterModifier, Relation } from 'src/common/interfaces';

@Injectable()
export class AuthRepository extends Repository<User> {
  constructor(readonly dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async createUser(
    data: Pick<User, 'name' | 'email'> &
      Partial<Pick<User, 'role' | 'isEmailVerified'>> & {
        password: string;
      },
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Save User
      const user = queryRunner.manager.create(User, {
        name: data.name,
        email: data.email,
        role: data.role,
        isEmailVerified: data.isEmailVerified,
      });
      const savedUser = await queryRunner.manager.save(user);

      // Save UserPassword
      const userPassword = queryRunner.manager.create(UserPassword, {
        password: data.password,
        user: savedUser,
      });
      await queryRunner.manager.save(userPassword);

      await queryRunner.commitTransaction();
      return savedUser;
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async findByEmail(email: string, relations: Relation[]) {
    const qb = this.createQueryBuilder('user');

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

    return qb.where('user.email = :email', { email }).getOne();
  }

  async findById(userId: number, relations: Relation[], filters: FilterModifier[]) {
    const qb = this.createQueryBuilder('user');

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

    qb.where('user.id = :userId', { userId });

    filters.forEach((f) => {
      qb.andWhere(f.clause, f.param);
    });

    return qb.getOne();
  }

  findAllUsers(
    page: number,
    limit: number,
    relations: Relation[],
    filters: FilterModifier[],
    search?: string,
  ) {
    const qb = this.createQueryBuilder('user');

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

    let append = false;
    if (search) {
      qb.where(
        new Brackets((qb) => {
          qb.where('user.name LIKE :search', {
            search: `%${search}%`,
          }).orWhere('user.email LIKE :search', {
            search: `%${search}%`,
          });
        }),
      );
      append = true;
    }

    filters.forEach((f, index) => {
      if (index === 0 && !append) {
        qb.where(f.clause, f.param);
      } else {
        qb.andWhere(f.clause, f.param);
      }
      append = true;
    });

    return qb
      .orderBy('user.createdAt', 'DESC')
      .take(limit)
      .skip(limit * (page - 1))
      .getManyAndCount();
  }
}
