// pro-user.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { ApproveUserDto, GetProUsersDto } from './dto/get-pro-users.dto';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';
import { ProUserService } from './memeber-request.service';
import { Request } from 'express';

@ApiTags('Member Requests')
@ApiBearerAuth(SWAGGER_AUTH.CHURCH_ADMIN)
@Controller('member-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProUserController {
  constructor(private readonly proUserService: ProUserService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.CHURCH_ADMIN)
  @ApiOperation({
    summary: 'Get all member requests',
    description:
      'Get paginated list of users with filtering options. Returns limited fields for list view.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'approved', 'rejected', 'all'],
  })
  @ApiQuery({
    name: 'account_type',
    required: false,
    enum: ['USER', 'PRO_USER', 'all'],
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by name or email',
  })
  @ApiQuery({
    name: 'church_name',
    required: false,
    description: 'Filter by church name',
  })
  @ApiQuery({
    name: 'sort_by',
    required: false,
    enum: ['created_at', 'first_name', 'last_name', 'status'],
  })
  @ApiQuery({ name: 'sort_order', required: false, enum: ['asc', 'desc'] })
  async getAllProUsers(@Query() query: GetProUsersDto) {
    return this.proUserService.getAllProUsers(query);
  }

  @Get(':userId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.CHURCH_ADMIN)
  @ApiOperation({
    summary: 'Get single member details',
    description:
      'Get complete details of a specific member including personal, professional, and role information.',
  })
  @ApiParam({ name: 'userId', description: 'User ID', example: 'user_123' })
  @ApiResponse({
    status: 200,
    description: 'Member details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getSingleMember(@Param('userId') userId: string) {
    return this.proUserService.getSingleMember(userId);
  }

  @Post(':userId/approve')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({
    summary: 'Approve a user as helper or member',
    description:
      'Approve a pending user and assign them either HELPER or CHURCH_MEMBER role.',
  })
  @ApiParam({ name: 'userId', description: 'User ID', example: 'user_123' })
  @ApiResponse({ status: 200, description: 'User approved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'User is already approved' })
  async approveUser(
    @Param('userId') userId: string,
    @Body() approveUserDto: ApproveUserDto,
    @Req() req: Request
  ) {
    const adminId = req.user.userId;
    return this.proUserService.approveUser(userId, approveUserDto, adminId);
  }
}
