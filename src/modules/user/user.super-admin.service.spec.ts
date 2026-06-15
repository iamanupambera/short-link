import { Test, TestingModule } from '@nestjs/testing';
import { UserSuperAdminService } from './user.super-admin.service';
import { AuthRepository } from '../auth/repository/auth.repository';
import { NotFoundException } from '@nestjs/common';
import { UserStatus } from '../auth/entities/user.entity';

describe('UserSuperAdminService', () => {
  let service: UserSuperAdminService;
  let mockAuthRepository: any;

  beforeEach(async () => {
    mockAuthRepository = {
      findAllUsers: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserSuperAdminService, { provide: AuthRepository, useValue: mockAuthRepository }],
    }).compile();

    service = module.get<UserSuperAdminService>(UserSuperAdminService);
  });

  describe('getUsers', () => {
    it('should return paginated users structure', async () => {
      const mockUsers = [{ id: 1, email: 'admin@test.com' }];
      mockAuthRepository.findAllUsers.mockResolvedValue([mockUsers, 1]);

      const result = await service.getUsers(1, 10, [], 'search-term');

      expect(mockAuthRepository.findAllUsers).toHaveBeenCalledWith(1, 10, [], [], 'search-term');
      expect(result).toEqual({
        data: mockUsers,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
        },
      });
    });
  });

  describe('getUserById', () => {
    it('should return user if found', async () => {
      const mockUser = { id: 1, email: 'user@test.com' };
      mockAuthRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserById(1);

      expect(mockAuthRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user is not found', async () => {
      mockAuthRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserById(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUserStatus', () => {
    it('should update user status and save', async () => {
      const mockUser = { id: 1, status: UserStatus.ACTIVE };
      mockAuthRepository.findOne.mockResolvedValue(mockUser);
      mockAuthRepository.save.mockImplementation((u) => Promise.resolve(u));

      const result = await service.updateUserStatus(1, UserStatus.INACTIVE);

      expect(mockAuthRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockUser.status).toBe(UserStatus.INACTIVE);
      expect(mockAuthRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user to update is not found', async () => {
      mockAuthRepository.findOne.mockResolvedValue(null);

      await expect(service.updateUserStatus(1, UserStatus.INACTIVE)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
