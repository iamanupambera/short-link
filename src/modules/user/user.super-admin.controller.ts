import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
} from '@nestjs/common';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UserSuperAdminService } from './user.super-admin.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { FiltersGuard } from 'src/common/guards/filters.guard';
import { UserRoleFilter } from 'src/common/filters/userRoleFilter';
import { UserVerifiedFilter } from 'src/common/filters/userVerifiedFilter';
import { Filter } from 'src/common/decorator/filter.decorator';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FilterModifier, Response as ApiResponse } from 'src/common/interfaces';

@ApiTags('Super Admin User Management')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class UserSuperAdminController {
  constructor(private readonly userSuperAdminService: UserSuperAdminService) {}

  @Get()
  @UseGuards(new FiltersGuard([new UserRoleFilter(), new UserVerifiedFilter()]))
  @ApiOperation({ summary: 'Get all users (Super Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: UserRole,
    description: 'Filter by role using ?filters[role]=USER',
  })
  @ApiQuery({
    name: 'isEmailVerified',
    required: false,
    type: Boolean,
    description: 'Filter by email verification status using ?filters[isEmailVerified]=true',
  })
  async findAll(
    @Filter() filters: FilterModifier[],
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ): Promise<ApiResponse> {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 10;
    const result = await this.userSuperAdminService.getUsers(p, l, filters, search);
    return {
      statusCode: 200,
      response: result,
      message: 'Users retrieved successfully',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific user (Super Admin only)' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ApiResponse> {
    const user = await this.userSuperAdminService.getUserById(id);
    return {
      statusCode: 200,
      response: user,
      message: 'User details retrieved successfully',
    };
  }

  @Patch(':id/status')
  @HttpCode(200)
  @ApiOperation({ summary: 'Change user status (Super Admin only)' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<ApiResponse> {
    const user = await this.userSuperAdminService.updateUserStatus(id, dto.status);
    return {
      statusCode: 200,
      response: user,
      message: 'User status updated successfully',
    };
  }
}
