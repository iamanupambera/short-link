import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { LinksService } from './links.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AuthUser } from 'src/common/decorator/auth-user.decorator';
import {
  type AuthUserInterface,
  Response as ApiResponse,
  type FilterModifier,
} from 'src/common/interfaces';
import { FiltersGuard } from 'src/common/guards/filters.guard';
import { LinkStatusFilter } from 'src/common/filters/linkStatusFilter';
import { Filter } from 'src/common/decorator/filter.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse as SwaggerResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LinkStatus } from './entities/link.entity';

@ApiTags('Links')
@Controller('links')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a shortened link' })
  @SwaggerResponse({ status: 201, description: 'Short link created successfully.' })
  async create(
    @Body() createLinkDto: CreateLinkDto,
    @AuthUser() user: AuthUserInterface,
  ): Promise<ApiResponse> {
    const link = await this.linksService.createLink(createLinkDto, user.userId);
    return {
      statusCode: 201,
      response: link,
      message: 'Short link created successfully',
    };
  }

  @Get()
  @UseGuards(new FiltersGuard([new LinkStatusFilter()]))
  @ApiOperation({ summary: 'Get all links for the authenticated user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: LinkStatus,
    description: 'Filter by status using ?filters[status]=ACTIVE',
  })
  async findAll(
    @AuthUser() user: AuthUserInterface,
    @Filter() filters: FilterModifier[],
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ): Promise<ApiResponse> {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 10;
    const result = await this.linksService.getLinks(user.userId, p, l, filters, search);
    return {
      statusCode: 200,
      response: result,
      message: 'Links retrieved successfully',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific link' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @AuthUser() user: AuthUserInterface,
  ): Promise<ApiResponse> {
    const link = await this.linksService.getLinkById(id, user.userId);
    return {
      statusCode: 200,
      response: link,
      message: 'Link details retrieved successfully',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a shortened link' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLinkDto: UpdateLinkDto,
    @AuthUser() user: AuthUserInterface,
  ): Promise<ApiResponse> {
    const link = await this.linksService.updateLink(id, updateLinkDto, user.userId);
    return {
      statusCode: 200,
      response: link,
      message: 'Link updated successfully',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a shortened link' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @AuthUser() user: AuthUserInterface,
  ): Promise<ApiResponse> {
    await this.linksService.deleteLink(id, user.userId);
    return {
      statusCode: 200,
      response: {},
      message: 'Link deleted successfully',
    };
  }
}
