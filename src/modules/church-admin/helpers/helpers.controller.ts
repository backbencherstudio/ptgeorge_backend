// helpers.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';
import { Request } from 'express';
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { HelpersService } from './helpers.service';
import { CreateHelperDto, UpdateHelperDto } from './dto/helper.dto';
import { ChurchMemberStatus, UserStatus } from 'prisma/generated/enums';

@ApiTags('Helpers')
@ApiBearerAuth(SWAGGER_AUTH.CHURCH_ADMIN)
@Controller('church-admin/helpers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CHURCH_ADMIN, Role.SUPER_ADMIN, Role.ADMIN)
export class HelpersController {
  constructor(private readonly helpersService: HelpersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all helpers',
    description:
      "Returns a list of all users with HELPER role in the admin's church. Supports search and pagination.",
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by name, email, or phone',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: UserStatus,
    description: 'Filter by user status (PENDING, ACTIVE, SUSPENDED, REJECTED)',
  })
  @ApiQuery({
    name: 'memberStatus',
    required: false,
    enum: ChurchMemberStatus,
    description:
      'Filter by church member status (PENDING, ACTIVE, INACTIVE, REMOVED)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'fields',
    required: false,
    description: 'Comma-separated list of fields to return',
    example: 'id,first_name,last_name,email,avatar',
  })
  async getAllHelpers(
    @Req() req: Request,
    @Query('search') search?: string,
    @Query('status') status?: UserStatus,
    @Query('memberStatus') memberStatus?: ChurchMemberStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('fields') fields?: string,
  ) {
    const userId = req.user?.userId;

    // Parse fields if provided
    let fieldsArray: string[] | undefined;
    if (fields) {
      fieldsArray = fields.split(',').map((f) => f.trim());
    }

    return this.helpersService.getAllHelpers(userId, {
      search,
      status,
      memberStatus,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 10,
      fields: fieldsArray,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get helper details by ID',
    description: 'Returns detailed information about a specific helper.',
  })
  async getHelperById(@Req() req: Request, @Param('id') id: string) {
    const userId = req.user?.userId;
    return this.helpersService.getHelperById(userId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'avatar', maxCount: 1 },
        { name: 'portfolio_images', maxCount: 10 },
      ],
      {
        storage: memoryStorage(),
        limits: {
          fileSize: 5 * 1024 * 1024,
        },
      },
    ),
  )
  @ApiOperation({
    summary: 'Create a new helper',
    description:
      'Creates a new user and assigns them the HELPER role in the church.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        email: { type: 'string' },
        phone_number: { type: 'string' },
        password: { type: 'string' },
        company_name: { type: 'string' },
        business_email: { type: 'string' },
        business_phone: { type: 'string' },
        category: { type: 'string' },
        profession: { type: 'string' },
        website: { type: 'string' },
        whatsapp_number: { type: 'string' },
        available_time: { type: 'string' },
        address_line1: { type: 'string' },
        address_line2: { type: 'string' },
        description: { type: 'string' },

        avatar: {
          type: 'string',
          format: 'binary',
        },

        portfolio_images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  async createHelper(
    @Req() req: Request,
    @Body() dto: CreateHelperDto,
    @UploadedFiles()
    files: {
      avatar?: Express.Multer.File[];
      portfolio_images?: Express.Multer.File[];
    },
  ) {
    const userId = req.user?.userId;

    const avatarFile = files?.avatar?.[0];
    const portfolioFiles = files?.portfolio_images || [];

    return this.helpersService.createHelper(
      userId,
      dto,
      avatarFile,
      portfolioFiles,
    );
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'avatar', maxCount: 1 },
        { name: 'portfolio_images', maxCount: 10 },
      ],
      {
        storage: memoryStorage(),
        limits: {
          fileSize: 5 * 1024 * 1024,
        },
      },
    ),
  )
  @ApiOperation({
    summary: 'Update helper information',
    description:
      'Updates helper details including availability, skills, avatar, and portfolio images.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        phone_number: { type: 'string' },
        language: { type: 'string' },
        about_me: { type: 'string' },
        availability: { type: 'string' },
        address: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        zip_code: { type: 'string' },
        country: { type: 'string' },
        gender: { type: 'string' },
        date_of_birth: { type: 'string' },
        bio: { type: 'string' },
        skills: {
          type: 'array',
          items: { type: 'string' },
        },
        company_name: { type: 'string' },
        business_email: { type: 'string' },
        business_phone: { type: 'string' },
        service: { type: 'string' },
        category: { type: 'string' },
        profession: { type: 'string' },
        website: { type: 'string' },
        whatsapp_number: { type: 'string' },
        available_time: { type: 'string' },
        address_line1: { type: 'string' },
        address_line2: { type: 'string' },
        description: { type: 'string' },

        delete_portfolio_images: {
          type: 'array',
          items: { type: 'string' },
        },

        avatar: {
          type: 'string',
          format: 'binary',
          description: 'New avatar image file (replaces existing)',
        },

        portfolio_images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'New portfolio images to add (up to 10 files)',
        },
      },
    },
  })
  async updateHelper(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateHelperDto,
    @UploadedFiles()
    files: {
      avatar?: Express.Multer.File[];
      portfolio_images?: Express.Multer.File[];
    },
  ) {
    const userId = req.user?.userId;

    const avatarFile = files?.avatar?.[0];
    const portfolioFiles = files?.portfolio_images || [];

    return this.helpersService.updateHelper(
      userId,
      id,
      dto,
      avatarFile,
      portfolioFiles,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove helper role',
    description:
      'Removes the HELPER role from a user and assigns them the CHURCH_MEMBER role instead.',
  })
  async removeHelper(@Req() req: Request, @Param('id') id: string) {
    const userId = req.user?.userId;
    return this.helpersService.removeHelperRole(userId, id);
  }
}
