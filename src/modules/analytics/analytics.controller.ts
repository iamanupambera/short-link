import { Controller, Get, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AuthUser } from 'src/common/decorator/auth-user.decorator';
import { type AuthUserInterface, Response as ApiResponse } from 'src/common/interfaces';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get aggregated dashboard analytics' })
  @SwaggerResponse({ status: 200, description: 'Dashboard metrics retrieved successfully.' })
  async getDashboard(@AuthUser() user: AuthUserInterface): Promise<ApiResponse> {
    const data = await this.analyticsService.getDashboardAnalytics(user.userId);
    return {
      statusCode: 200,
      response: data,
      message: 'Dashboard analytics retrieved successfully',
    };
  }

  @Get(':linkId')
  @ApiOperation({ summary: 'Get analytics for a specific link' })
  @SwaggerResponse({ status: 200, description: 'Link analytics retrieved successfully.' })
  async getLinkStats(
    @Param('linkId', ParseIntPipe) linkId: number,
    @AuthUser() user: AuthUserInterface,
  ): Promise<ApiResponse> {
    const data = await this.analyticsService.getLinkAnalytics(linkId, user.userId);
    return {
      statusCode: 200,
      response: data,
      message: 'Link analytics retrieved successfully',
    };
  }
}
