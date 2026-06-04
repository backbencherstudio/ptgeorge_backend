import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { ChurchRoleAssignmentService } from './church-role-assignment.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RequirePermission } from 'src/modules/auth/decorators/require-permission.decorator';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';
import { ChurchMemberStatus, UserStatus } from 'prisma/generated/enums';

@ApiTags('Church Role Assignment')
@ApiBearerAuth(SWAGGER_AUTH.CHURCH_ADMIN)
@Controller('church/roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ChurchRoleAssignmentController {
  constructor(private readonly service: ChurchRoleAssignmentService) {}

  @Get('assignable')
  @ApiOperation({ summary: 'Get roles the current admin can assign' })
  async getAssignableRoles(@Request() req) {
    const userId = req.user.userId;
    const roles = await this.service.getAssignableRoles(userId);
    return { message: 'Assignable roles fetched', data: roles };
  }

  @Get('users')
  @ApiOperation({ summary: 'List all church users with their assigned roles' })
  async getChurchUsers(@Request() req) {
    const users = await this.service.getChurchUsers(req.user.userId);
    return { message: 'Church users fetched', data: users };
  }

  @Get('users/all')
  @ApiOperation({
    summary: 'Get all church users (including inactive, active, suspended)',
    description:
      "Returns complete list of all users associated with the admin's church, including their status, roles, and membership information. Supports pagination, search, filtering, and field selection.",
  })
  @ApiBearerAuth(SWAGGER_AUTH.CHURCH_ADMIN)
  @ApiQuery({
    name: 'status',
    enum: UserStatus,
    required: false,
    description: 'Filter by user status (PENDING, ACTIVE, SUSPENDED, REJECTED)',
  })
  @ApiQuery({
    name: 'memberStatus',
    enum: ChurchMemberStatus,
    required: false,
    description:
      'Filter by church member status (PENDING, ACTIVE, INACTIVE, REMOVED)',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    description: 'Filter by role name (e.g., PASTOR, HELPER, CHURCH_MEMBER)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by name, email, or phone number',
  })
  @ApiQuery({
    name: 'fields',
    required: false,
    description:
      'Comma-separated list of fields to return (e.g., id,email,full_name,status)',
    example: 'id,full_name,email,status,currentRole',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 10,
    type: Number,
  })
  @RequirePermission('read', 'Member')
  async getAllChurchUsers(
    @Request() req,
    @Query('status') status?: UserStatus,
    @Query('memberStatus') memberStatus?: ChurchMemberStatus,
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('fields') fields?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Validate status is valid UserStatus enum
    let validStatus: UserStatus | undefined;
    if (status) {
      if (Object.values(UserStatus).includes(status as UserStatus)) {
        validStatus = status as UserStatus;
      } else {
        throw new BadRequestException(
          `Invalid status value. Must be one of: ${Object.values(UserStatus).join(', ')}`,
        );
      }
    }

    // Validate memberStatus is valid ChurchMemberStatus enum
    let validMemberStatus: ChurchMemberStatus | undefined;
    if (memberStatus) {
      if (
        Object.values(ChurchMemberStatus).includes(
          memberStatus as ChurchMemberStatus,
        )
      ) {
        validMemberStatus = memberStatus as ChurchMemberStatus;
      } else {
        throw new BadRequestException(
          `Invalid memberStatus value. Must be one of: ${Object.values(ChurchMemberStatus).join(', ')}`,
        );
      }
    }

    // Parse fields parameter (comma-separated string to array)
    let fieldsArray: string[] | undefined;
    if (fields) {
      fieldsArray = fields.split(',').map((f) => f.trim());

      // Validate field names (optional but recommended)
      const validFields = [
        'id',
        'first_name',
        'last_name',
        'full_name',
        'email',
        'phone_number',
        'church_name',
        'language',
        'status',
        'userType',
        'churchMemberStatus',
        'isEmailVerified',
        'email_verified_at',
        'joinedAt',
        'created_at',
        'updated_at',
        'deleted_at',
        'churchRole',
        'currentRole',
        'assignedBy',
        'assignedAt',
        'company_name',
        'business_email',
        'service',
        'category',
        'profession',
        'website',
        'whatsapp_number',
        'available_time',
        'address_line1',
        'address_line2',
        'state',
        'country',
        'zip_code',
        'business_portfolio',
        'description',
        'avatar',
        'about_me',
        'bio',
      ];

      const invalidFields = fieldsArray.filter((f) => !validFields.includes(f));
      if (invalidFields.length > 0) {
        throw new BadRequestException(
          `Invalid field(s): ${invalidFields.join(', ')}. Valid fields are: ${validFields.join(', ')}`,
        );
      }
    }

    const result = await this.service.getAllChurchUsers(req.user.userId, {
      status: validStatus,
      memberStatus: validMemberStatus,
      role,
      search,
      fields: fieldsArray,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });

    return {
      message: 'Church users retrieved successfully',
      churchId: result.churchId,
      churchName: result.churchName,
      data: result.users,
      pagination: result.pagination,
    };
  }

  @Post('assign')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('assign', 'Role') // Fixed: Pass as two arguments
  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiBody({ type: AssignRoleDto })
  async assignRole(@Request() req, @Body() dto: AssignRoleDto) {
    return this.service.assignRole(req.user.userId, dto);
  }

  @Patch('users/:userId/role')
  @RequirePermission('assign', 'Role') // Fixed: Pass as two arguments
  @ApiOperation({ summary: 'Change a user’s role' })
  @ApiParam({ name: 'userId', description: 'User ID to update' })
  @ApiBody({ type: UpdateUserRoleDto })
  async updateUserRole(
    @Request() req,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.service.updateUserRole(req.user.userId, userId, dto.newRoleId);
  }

  @Delete('users/:userId/role')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('assign', 'Role') // Fixed: Pass as two arguments
  @ApiOperation({ summary: 'Remove a user’s role' })
  @ApiParam({ name: 'userId', description: 'User ID to revoke role from' })
  async removeRole(@Request() req, @Param('userId') userId: string) {
    return this.service.removeRole(req.user.userId, userId);
  }
}
