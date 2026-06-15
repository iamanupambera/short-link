import { Test, TestingModule } from '@nestjs/testing';
import { UserSuperAdminController } from './user.super-admin.controller';
import { UserSuperAdminService } from './user.super-admin.service';
import { UserStatus } from '../auth/entities/user.entity';

describe('UserSuperAdminController', () => {
  let controller: UserSuperAdminController;
  let mockService: any;

  beforeEach(async () => {
    mockService = {
      getUsers: jest.fn(),
      getUserById: jest.fn(),
      updateUserStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserSuperAdminController],
      providers: [{ provide: UserSuperAdminService, useValue: mockService }],
    }).compile();

    controller = module.get<UserSuperAdminController>(UserSuperAdminController);
  });

  describe('findAll', () => {
    it('should return paginated users with defaults', async () => {
      const mockResult = {
        data: [],
        pagination: { page: 1, limit: 10, total: 0 },
      };
      mockService.getUsers.mockResolvedValue(mockResult);

      const result = await controller.findAll([], undefined, undefined, undefined);

      expect(mockService.getUsers).toHaveBeenCalledWith(1, 10, [], undefined);
      expect(result).toEqual({
        statusCode: 200,
        response: mockResult,
        message: 'Users retrieved successfully',
      });
    });

    it('should parse page, limit and search query params', async () => {
      const mockResult = {
        data: [],
        pagination: { page: 2, limit: 5, total: 0 },
      };
      mockService.getUsers.mockResolvedValue(mockResult);

      const result = await controller.findAll([], '2', '5', 'alice');

      expect(mockService.getUsers).toHaveBeenCalledWith(2, 5, [], 'alice');
      expect(result).toEqual({
        statusCode: 200,
        response: mockResult,
        message: 'Users retrieved successfully',
      });
    });
  });

  describe('findOne', () => {
    it('should return details for a specific user', async () => {
      const mockUser = { id: 1, email: 'user@test.com' };
      mockService.getUserById.mockResolvedValue(mockUser);

      const result = await controller.findOne(1);

      expect(mockService.getUserById).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        statusCode: 200,
        response: mockUser,
        message: 'User details retrieved successfully',
      });
    });
  });

  describe('updateStatus', () => {
    it('should update user status', async () => {
      const mockUser = { id: 1, status: UserStatus.INACTIVE };
      mockService.updateUserStatus.mockResolvedValue(mockUser);

      const result = await controller.updateStatus(1, { status: UserStatus.INACTIVE });

      expect(mockService.updateUserStatus).toHaveBeenCalledWith(1, UserStatus.INACTIVE);
      expect(result).toEqual({
        statusCode: 200,
        response: mockUser,
        message: 'User status updated successfully',
      });
    });
  });
});
