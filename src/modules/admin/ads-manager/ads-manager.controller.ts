import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  Ip,
  Headers,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiConsumes,
  ApiResponse,
} from '@nestjs/swagger';
import { CreateAdDto } from './dto/create-ad.dto';
import { UpdateAdDto } from './dto/update-ad.dto';
import { AdQueryDto } from './dto/ad-query.dto';
import { AdsService } from './ads-manager.service';
import { AdPlacement, AdStatus } from 'prisma/generated/enums';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { CursorPaginationDto } from './dto/cursor-pagination.dto';
import { Public } from 'src/common/guard/role/public.decorator';

@ApiTags('Ads Manager')
@ApiBearerAuth(SWAGGER_AUTH.CHURCH_MEMBER)
@Controller('ads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new ad with thumbnail upload',
    description: 'Creates a new advertisement with image upload support',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Bible Study App – DigiSanctuary' },
        description: {
          type: 'string',
          example: 'Join our Bible study community',
        },
        link: { type: 'string', example: 'https://example.com' },
        status: {
          type: 'string',
          enum: Object.values(AdStatus),
          default: AdStatus.ACTIVE,
          example: AdStatus.ACTIVE,
        },
        placement: {
          type: 'string',
          enum: Object.values(AdPlacement),
          default: AdPlacement.HOME_BANNER,
          example: AdPlacement.HOME_BANNER,
        },
        country: {
          type: 'string',
          example: 'USA',
          description: 'Target country (optional)',
        },
        city: {
          type: 'string',
          example: 'New York',
          description: 'Target city/state (optional)',
        },
        start_date: {
          type: 'string',
          format: 'date-time',
          example: '2027-01-10T00:00:00Z',
        },
        end_date: {
          type: 'string',
          format: 'date-time',
          example: '2030-12-31T23:59:59Z',
        },
        thumbnail: {
          type: 'string',
          format: 'binary',
          description: 'Thumbnail image file (JPG, PNG, GIF)',
        },
      },
      required: ['title', 'description', 'link', 'start_date', 'end_date'],
    },
  })
  @UseInterceptors(FileInterceptor('thumbnail'))
  async create(
    @Body() createAdDto: CreateAdDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;

    // Validate file if provided
    if (file) {
      const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Only image files (JPG, PNG, GIF, WEBP) are allowed',
        );
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new BadRequestException('File size must be less than 5MB');
      }
    }

    return this.adsService.create(createAdDto, userId, file);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all ads',
    description: 'Retrieve ads with pagination and filtering options',
  })
  @ApiQuery({
    name: 'status',
    enum: AdStatus,
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'placement',
    enum: AdPlacement,
    required: false,
    description: 'Filter by placement',
  })
  @ApiQuery({
    name: 'country',
    type: 'string',
    required: false,
    description: 'Filter by country',
  })
  @ApiQuery({
    name: 'city',
    type: 'string',
    required: false,
    description: 'Filter by city',
  })
  @ApiQuery({
    name: 'created_by_id',
    type: 'string',
    required: false,
    description: 'Filter by creator',
  })
  @ApiQuery({
    name: 'search',
    type: 'string',
    required: false,
    description: 'Search by title/description',
  })
  @ApiQuery({
    name: 'start_date_from',
    type: 'string',
    required: false,
    description: 'Start date from',
  })
  @ApiQuery({
    name: 'start_date_to',
    type: 'string',
    required: false,
    description: 'Start date to',
  })
  @ApiQuery({
    name: 'page',
    type: 'number',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    type: 'number',
    required: false,
    description: 'Items per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'List of ads retrieved successfully',
  })
  findAll(@Query() query: AdQueryDto, @Req() req: any) {
    const userId = req.user?.userId;
    const isAdmin =
      req.user?.type === 'SUPER_ADMIN' || req.user?.type === 'ADMIN';
    return this.adsService.findAll(query, userId, isAdmin);
  }

  @Get('public')
  @Public()
  @ApiOperation({
    summary: 'Get active ads with cursor pagination for feed',
    description:
      'Public endpoint to retrieve active ads with cursor-based pagination for displaying in feed',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Number of items per page (default: 10, max: 50)',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description:
      'Cursor (ad ID) for pagination. Pass the last ad ID from previous page',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
    description: 'Order direction (default: desc)',
  })
  @ApiQuery({
    name: 'placement',
    required: false,
    enum: AdPlacement,
    description: 'Filter by placement',
  })
  @ApiQuery({
    name: 'country',
    required: false,
    type: String,
    description: 'Filter by country',
  })
  @ApiQuery({
    name: 'city',
    required: false,
    type: String,
    description: 'Filter by city',
  })
  async getPublicAds(@Query() cursorPaginationDto: CursorPaginationDto) {
    return this.adsService.findPublicAds(cursorPaginationDto);
  }

  @Get('dashboard/analytics')
  @ApiOperation({
    summary: 'Get dashboard analytics',
    description:
      'Get overall analytics including total views, clicks, CTR, and top performing ads',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard analytics retrieved successfully',
  })
  getDashboardAnalytics(@Req() req: any) {
    const userId = req.user?.userId;
    const isAdmin =
      req.user?.type === 'SUPER_ADMIN' || req.user?.type === 'CHURCH_ADMIN';
    return this.adsService.getDashboardAnalytics(userId, isAdmin);
  }

  @Get('active/placement/:placement')
  @ApiOperation({
    summary: 'Get active ads for a specific placement',
    description: 'Public endpoint to retrieve active ads for frontend display',
  })
  @ApiParam({
    name: 'placement',
    enum: AdPlacement,
    description: 'Ad placement location',
  })
  @ApiQuery({
    name: 'country',
    type: 'string',
    required: false,
    description: 'Filter by country',
  })
  @ApiQuery({
    name: 'city',
    type: 'string',
    required: false,
    description: 'Filter by city',
  })
  @ApiResponse({
    status: 200,
    description: 'Active ads retrieved successfully',
  })
  getActiveAds(
    @Param('placement') placement: string,
    @Query('country') country?: string,
    @Query('city') city?: string,
  ) {
    return this.adsService.getActiveAdsForPlacement(placement, {
      country,
      city,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ad by ID' })
  @ApiParam({ name: 'id', description: 'Ad ID', format: 'string' })
  @ApiResponse({ status: 200, description: 'Ad retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Ad not found' })
  findOne(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.userId;
    const isAdmin =
      req.user?.type === 'SUPER_ADMIN' || req.user?.type === 'ADMIN';
    return this.adsService.findOne(id, userId, isAdmin);
  }

  @Get(':id/analytics')
  @ApiOperation({
    summary: 'Get detailed analytics for a specific ad',
    description:
      'Retrieve views, clicks, CTR, and time-based metrics for an ad',
  })
  @ApiParam({ name: 'id', description: 'Ad ID', format: 'string' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  getAdAnalytics(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.userId;
    const isAdmin =
      req.user?.type === 'SUPER_ADMIN' || req.user?.type === 'ADMIN';
    return this.adsService.getAdAnalytics(id, userId, isAdmin);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an ad with optional thumbnail upload' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Ad ID', format: 'string' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Updated Ad Title' },
        description: { type: 'string', example: 'Updated description' },
        link: { type: 'string', example: 'https://example.com/updated' },
        status: {
          type: 'string',
          enum: Object.values(AdStatus),
          example: AdStatus.PAUSED,
        },
        placement: {
          type: 'string',
          enum: Object.values(AdPlacement),
          example: AdPlacement.SIDEBAR,
        },
        country: {
          type: 'string',
          example: 'Canada',
          description: 'Target country (optional)',
        },
        city: {
          type: 'string',
          example: 'Toronto',
          description: 'Target city/state (optional)',
        },
        start_date: {
          type: 'string',
          format: 'date-time',
          example: '2027-01-10T00:00:00Z',
        },
        end_date: {
          type: 'string',
          format: 'date-time',
          example: '2030-12-31T23:59:59Z',
        },
        thumbnail: {
          type: 'string',
          format: 'binary',
          description: 'New thumbnail image file (optional)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('thumbnail'))
  async update(
    @Param('id') id: string,
    @Body() updateAdDto: UpdateAdDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    const isAdmin =
      req.user?.type === 'SUPER_ADMIN' || req.user?.type === 'ADMIN';

    // Validate file if provided
    if (file) {
      const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Only image files (JPG, PNG, GIF, WEBP) are allowed',
        );
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new BadRequestException('File size must be less than 5MB');
      }
    }

    return this.adsService.update(id, updateAdDto, userId, isAdmin, file);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update ad status (ACTIVE/PAUSED/HIDDEN)' })
  @ApiParam({ name: 'id', description: 'Ad ID', format: 'string' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: Object.values(AdStatus),
          example: AdStatus.PAUSED,
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Ad status updated successfully' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: AdStatus,
    @Req() req: any,
  ) {
    return this.adsService.update(
      id,
      { status },
      req.user?.userId,
      req.user?.type === 'SUPER_ADMIN' || req.user?.type === 'ADMIN',
    );
  }

  @Post('bulk/status')
  @ApiOperation({ summary: 'Bulk update ad status' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string' },
          example: ['id1', 'id2'],
        },
        status: {
          type: 'string',
          enum: Object.values(AdStatus),
          example: AdStatus.PAUSED,
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Bulk status update completed' })
  bulkUpdateStatus(
    @Body('ids') ids: string[],
    @Body('status') status: AdStatus,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    const isAdmin =
      req.user?.type === 'SUPER_ADMIN' || req.user?.type === 'ADMIN';
    return this.adsService.bulkUpdateStatus(ids, status, userId, isAdmin);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an ad (soft delete)' })
  @ApiParam({ name: 'id', description: 'Ad ID', format: 'string' })
  @ApiResponse({ status: 200, description: 'Ad deleted successfully' })
  remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.userId;
    const isAdmin =
      req.user?.type === 'SUPER_ADMIN' || req.user?.type === 'ADMIN';
    return this.adsService.remove(id, userId, isAdmin);
  }

  @Post(':id/track-view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Track ad view',
    description: 'Public endpoint to track ad impressions',
  })
  @ApiParam({ name: 'id', description: 'Ad ID', format: 'string' })
  @ApiResponse({ status: 200, description: 'View tracked successfully' })
  async trackView(
    @Param('id') id: string,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const userId = req.user?.userId;
    return this.adsService.trackView(id, userId, ip, userAgent);
  }

  @Post(':id/track-click')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Track ad click',
    description: 'Public endpoint to track ad clicks',
  })
  @ApiParam({ name: 'id', description: 'Ad ID', format: 'string' })
  @ApiResponse({ status: 200, description: 'Click tracked successfully' })
  async trackClick(
    @Param('id') id: string,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const userId = req.user?.userId;
    return this.adsService.trackClick(id, userId, ip, userAgent);
  }
}
