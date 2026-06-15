import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import {
  CreateSystemAdminDto,
  UpdateSystemAdminDto,
} from './dto/create-system-admin.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';
import { SystemAdminService } from './system-admins.service';

@ApiTags('System Admins')
@ApiBearerAuth(SWAGGER_AUTH.SUPER_ADMIN)
@Controller('system-admins')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class SystemAdminController {
  constructor(private readonly systemAdminService: SystemAdminService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new system admin',
    description: `Creates a new system administrator with selected permissions.

**Two ways to assign permissions:**
1. **By category** - Provide category names, all permissions under those categories will be assigned
2. **By specific permissions** - Provide individual permission IDs

If both are provided, categories take precedence.`,
  })
  @ApiBody({
    type: CreateSystemAdminDto,
    examples: {
      by_categories: {
        summary: 'Assign permissions by categories',
        value: {
          first_name: 'Tom',
          last_name: 'Reeves',
          email: 'tom@platform.com',
          password: 'SecurePass123!',
          phone_number: '+1234567890',
          language: 'en',
          categories: ['Church', 'Member', 'Content'],
          status: 'ACTIVE',
        },
      },
      by_permissions: {
        summary: 'Assign specific permissions',
        value: {
          first_name: 'Lisa',
          last_name: 'Chen',
          email: 'lisa@platform.com',
          password: 'SecurePass123!',
          permissions: ['perm_id_1', 'perm_id_2', 'perm_id_3'],
        },
      },
    },
  })
  create(@Body() dto: CreateSystemAdminDto, @Request() req) {
    return this.systemAdminService.create(dto, req.user?.id);
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Get available permission categories',
    description:
      'Returns all permission categories with their permission counts for selection',
  })
  async getAvailableCategories() {
    const categories = await this.systemAdminService.getAvailableCategories();
    return {
      success: true,
      message: 'Categories fetched successfully',
      data: categories,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all system admins',
    description:
      'Returns a paginated list of all system administrators with their assigned permissions.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name or email',
    example: 'Tom',
  })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? Math.min(parseInt(limit, 10), 100) : 10;
    return this.systemAdminService.findAll(pageNumber, limitNumber, search);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single system admin by ID',
    description:
      'Returns full system admin details including all assigned permissions grouped by category.',
  })
  @ApiParam({
    name: 'id',
    description: 'System admin CUID',
    example: 'clxadmin001abc',
  })
  findOne(@Param('id') id: string) {
    return this.systemAdminService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a system admin',
    description: `Updates a system administrator's information and/or permissions.

Passing \`permissions\` replaces all existing permissions with the new set.
Pass an empty array \`[]\` to remove all permissions.
Omit \`permissions\` entirely to leave permissions unchanged.`,
  })
  @ApiParam({
    name: 'id',
    description: 'System admin CUID',
    example: 'clxadmin001abc',
  })
  @ApiBody({
    type: UpdateSystemAdminDto,
    examples: {
      update_info: {
        summary: 'Update personal info only',
        value: { first_name: 'Thomas', phone_number: '+1234567890' },
      },
      update_permissions: {
        summary: 'Replace all permissions',
        value: { permissions: ['clxperm001abc', 'clxperm005abc'] },
      },
      update_status: {
        summary: 'Suspend the admin',
        value: { status: 'SUSPENDED' },
      },
      update_all: {
        summary: 'Update info + permissions',
        value: {
          first_name: 'Thomas',
          status: 'ACTIVE',
          permissions: ['clxperm001abc'],
        },
      },
    },
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSystemAdminDto,
    @Request() req,
  ) {
    return this.systemAdminService.update(id, dto, req.user?.id);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Toggle system admin status',
    description: 'Toggles between `ACTIVE` and `SUSPENDED`.',
  })
  @ApiParam({
    name: 'id',
    description: 'System admin CUID',
    example: 'clxadmin001abc',
  })
  toggleStatus(@Param('id') id: string, @Request() req) {
    return this.systemAdminService.toggleStatus(id, req.user?.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a system admin (soft delete)',
    description: 'Soft-deletes the admin. Cannot delete your own account.',
  })
  @ApiParam({
    name: 'id',
    description: 'System admin CUID',
    example: 'clxadmin001abc',
  })
  remove(@Param('id') id: string, @Request() req) {
    return this.systemAdminService.remove(id, req.user?.id);
  }
}
