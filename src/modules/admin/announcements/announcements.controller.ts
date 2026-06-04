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
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementQueryDto } from './dto/announcement-query.dto';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { AnnouncementsService } from './annoucements.service';
import {
  AnnouncementAudience,
  AnnouncementStatus,
} from 'prisma/generated/enums';
import { PrismaService } from 'src/prisma/prisma.service';

@ApiTags('Announcements')
@ApiBearerAuth(SWAGGER_AUTH.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
@Controller('announcements')
export class AnnouncementsController {
  constructor(
    private readonly announcementsService: AnnouncementsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new announcement',
    description: `
Create an announcement with role-based permissions:

SUPER ADMIN can:
- Create announcements for ALL users
- Target specific churches using target_church_ids
- Send to church admins only
- Send to super admins only

CHURCH ADMIN can:
- Create announcements ONLY for their own church members
- Cannot target other churches
- Announcements automatically go to their church members
- target_church_ids is ignored (auto-set to their church)

How it works:
- Super Admin: target_church_ids [] = ALL churches | target_church_ids with IDs = ONLY those churches
- Church Admin: target_church_ids is ignored, announcement only goes to their church
    `,
  })
  @ApiBody({
    type: CreateAnnouncementDto,
    description: 'Announcement details',
    examples: {
      'Global Announcement': {
        summary: 'Announcement for ALL users',
        description: 'A platform-wide announcement everyone can see',
        value: {
          title: 'System Maintenance - Feb 15',
          message:
            'The platform will be down for scheduled maintenance from 2-4 AM EST.',
          status: 'PUBLISHED',
          audience: 'ALL_USERS',
          target_church_ids: [],
          start_date: '2025-02-08T00:00:00Z',
          end_date: '2025-02-15T23:59:59Z',
        },
      },
      'Single Church Announcement': {
        summary: 'Announcement for a specific church',
        description: 'ONLY members of Grace Church can see this',
        value: {
          title: 'Grace Church Christmas Service',
          message: 'Join us for Christmas Eve service at 7 PM.',
          status: 'PUBLISHED',
          audience: 'ALL_USERS',
          target_church_ids: ['grace-church-id-123'],
          start_date: '2025-12-20T00:00:00Z',
          end_date: '2025-12-25T23:59:59Z',
        },
      },
      'Multiple Churches Announcement': {
        summary: 'Announcement for multiple specific churches',
        description: 'ONLY selected churches will see this announcement',
        value: {
          title: 'Tax Form Deadline',
          message: 'All churches must submit their tax forms by March 1st.',
          status: 'PUBLISHED',
          audience: 'ALL_USERS',
          target_church_ids: [
            'grace-church-id',
            'faith-church-id',
            'hope-church-id',
          ],
          start_date: '2025-02-01T00:00:00Z',
          end_date: '2025-03-01T23:59:59Z',
        },
      },
      'Church Admin Only Announcement': {
        summary: 'Announcement for church administrators only',
        description: 'Only church admins across all churches can see this',
        value: {
          title: 'New Admin Features',
          message: 'Church admins can now manage member roles.',
          status: 'PUBLISHED',
          audience: 'CHURCH_ADMINS_ONLY',
          target_church_ids: [],
          start_date: '2025-02-10T00:00:00Z',
          end_date: '2025-02-28T23:59:59Z',
        },
      },
      'Super Admin Only Announcement': {
        summary: 'Announcement for super admins only',
        description: 'Only super administrators can see this',
        value: {
          title: 'System Upgrade Planning',
          message: 'Super admins, please review the Q2 upgrade plan.',
          status: 'PUBLISHED',
          audience: 'SUPER_ADMINS_ONLY',
          target_church_ids: [],
          start_date: '2025-02-01T00:00:00Z',
          end_date: '2025-02-28T23:59:59Z',
        },
      },
      'Draft Announcement': {
        summary: 'Save as draft (unpublished)',
        description:
          "Create but don't publish yet - only admins can see drafts",
        value: {
          title: 'Draft Announcement',
          message: 'This is still being reviewed',
          status: 'UNPUBLISHED',
          audience: 'ALL_USERS',
          target_church_ids: [],
          start_date: '2025-03-01T00:00:00Z',
          end_date: '2025-03-15T23:59:59Z',
        },
      },
    },
  })
  async create(@Body() createDto: CreateAnnouncementDto, @Req() req: any) {
    const userId = req.user?.userId;
    const userType = req.user?.type;

    // Get church ID from database if user is CHURCH_ADMIN
    let userChurchId = null;

    if (userType === 'CHURCH_ADMIN') {
      // Find the user's church membership
      const churchMember = await this.prisma.churchMember.findFirst({
        where: {
          user_id: userId,
          status: 'ACTIVE',
        },
        include: {
          church: {
            select: {
              id: true,
            },
          },
        },
      });

      if (churchMember) {
        userChurchId = churchMember.church_id;
      }
    }

    return this.announcementsService.create(
      createDto,
      userId,
      userType,
      userChurchId,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all announcements',
    description: `
Retrieve announcements with powerful filtering options:

 FILTERS:
- status: Get only published or unpublished announcements
- audience: Filter by who the announcement is for
- church_id: Get announcements targeting a specific church
- created_by_id: Find announcements by a specific admin
- search: Find by title or message content
- start_date_from/to: Get announcements within a date period
- active_only: Only get currently active announcements

 PAGINATION:
- page: Page number (default: 1)
- limit: Items per page (default: 10)
    `,
  })
  @ApiQuery({
    name: 'status',
    enum: AnnouncementStatus,
    required: false,
    description: 'Filter by publication status',
    example: AnnouncementStatus.PUBLISHED,
  })
  @ApiQuery({
    name: 'audience',
    enum: AnnouncementAudience,
    required: false,
    description: 'Filter by target audience',
    example: AnnouncementAudience.ALL_USERS,
  })
  @ApiQuery({
    name: 'church_id',
    type: 'string',
    required: false,
    description: 'Filter announcements targeting a specific church',
    example: 'grace-church-id-123',
  })
  @ApiQuery({
    name: 'created_by_id',
    type: 'string',
    required: false,
    description: 'Filter announcements created by a specific user',
    example: 'user-123',
  })
  @ApiQuery({
    name: 'search',
    type: 'string',
    required: false,
    description: ' Search in title or message content',
    example: 'maintenance',
  })
  @ApiQuery({
    name: 'start_date_from',
    type: 'string',
    required: false,
    description: 'Show announcements starting after this date',
    example: '2025-02-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'start_date_to',
    type: 'string',
    required: false,
    description: 'Show announcements starting before this date',
    example: '2025-02-28T23:59:59Z',
  })
  @ApiQuery({
    name: 'active_only',
    type: 'boolean',
    required: false,
    description:
      'Only show currently active announcements (published AND within date range)',
    example: true,
  })
  @ApiQuery({
    name: 'page',
    type: 'number',
    required: false,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    type: 'number',
    required: false,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Announcements retrieved successfully',
  })
  findAll(@Query() query: AnnouncementQueryDto, @Req() req: any) {
    const userId = req.user?.userId;
    const isAdmin =
      req.user?.type === 'SUPER_ADMIN' || req.user?.type === 'CHURCH_ADMIN';
    const userChurchId = req.user?.church_id;
    return this.announcementsService.findAll(
      query,
      userId,
      isAdmin,
      userChurchId,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single announcement by ID',
    description: 'Retrieve detailed information about a specific announcement',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the announcement (UUID format)',
    example: 'd637e85c-d8eb-4fd8-b75d-dba41078de30',
    format: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Announcement retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  findOne(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.userId;
    const isAdmin =
      req.user?.type === 'SUPER_ADMIN' || req.user?.type === 'CHURCH_ADMIN';
    const userChurchId = req.user?.church_id;
    return this.announcementsService.findOne(id, userId, isAdmin, userChurchId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: '✏️ Update an existing announcement',
    description: `
Update any field of an announcement. You can update:
- Title and message content
- Publication status (publish/unpublish)
- Target audience
- Date range
- Target churches

Only the creator or an admin can update an announcement.
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the announcement to update',
    example: 'd637e85c-d8eb-4fd8-b75d-dba41078de30',
    format: 'string',
  })
  @ApiBody({
    type: UpdateAnnouncementDto,
    description: 'Fields to update (all fields are optional)',
    examples: {
      'Update Status': {
        summary: 'Publish an announcement',
        value: {
          status: 'PUBLISHED',
        },
      },
      'Update Content': {
        summary: 'Change title and message',
        value: {
          title: 'Updated: Maintenance Rescheduled',
          message: 'The maintenance has been moved to Feb 16.',
        },
      },
      'Update Date Range': {
        summary: 'Extend announcement period',
        value: {
          end_date: '2025-02-20T23:59:59Z',
        },
      },
      'Update Target Churches': {
        summary: 'Change which churches see this',
        value: {
          target_church_ids: ['new-church-id-1', 'new-church-id-2'],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Announcement updated successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAnnouncementDto,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    const isAdmin =
      req.user?.type === 'SUPER_ADMIN' || req.user?.type === 'CHURCH_ADMIN';
    return this.announcementsService.update(id, updateDto, userId, isAdmin);
  }

  @Patch(':id/publish')
  @ApiOperation({
    summary: 'Publish an announcement',
    description: `
Change announcement status to PUBLISHED.
Once published, the announcement becomes visible to the target audience.
The announcement will only show during its active date range.
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the announcement to publish',
    format: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Announcement published successfully',
  })
  publish(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.userId;
    const isAdmin =
      req.user?.type === 'SUPER_ADMIN' || req.user?.type === 'CHURCH_ADMIN';
    return this.announcementsService.publish(id, userId, isAdmin);
  }

  @Patch(':id/unpublish')
  @ApiOperation({
    summary: 'Unpublish an announcement',
    description: `
Change announcement status to UNPUBLISHED.
The announcement will be hidden from all users immediately.
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the announcement to unpublish',
    format: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Announcement unpublished successfully',
  })
  unpublish(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.userId;
    const isAdmin =
      req.user?.type === 'SUPER_ADMIN' || req.user?.type === 'CHURCH_ADMIN';
    return this.announcementsService.unpublish(id, userId, isAdmin);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete an announcement',
    description: `
⚠️ WARNING: This is a SOFT DELETE.
The announcement will be hidden but remains in the database for audit purposes.
Only the creator or an admin can delete an announcement.
    `,
  })
  @ApiParam({
    name: 'id',
    description: 'ID of the announcement to delete',
    format: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Announcement deleted successfully',
  })
  remove(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.userId;
    const isAdmin =
      req.user?.type === 'SUPER_ADMIN' || req.user?.type === 'CHURCH_ADMIN';
    return this.announcementsService.remove(id, userId, isAdmin);
  }
}
