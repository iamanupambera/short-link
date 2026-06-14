import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthRepository } from '../auth/repository/auth.repository';
import { User, UserStatus } from '../auth/entities/user.entity';
import { FilterModifier, PaginationResponse } from 'src/common/interfaces';

@Injectable()
export class UserSuperAdminService {
  constructor(private readonly authRepository: AuthRepository) {}

  async getUsers(
    page: number,
    limit: number,
    filters: FilterModifier[],
    search?: string,
  ): Promise<PaginationResponse<User>> {
    const [data, total] = await this.authRepository.findAllUsers(page, limit, [], filters, search);
    return {
      data,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  async getUserById(id: number): Promise<User> {
    const user = await this.authRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async updateUserStatus(id: number, status: UserStatus): Promise<User> {
    const user = await this.authRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    user.status = status;
    return this.authRepository.save(user);
  }
}
