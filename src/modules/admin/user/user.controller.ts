import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  HttpStatus,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../../../common/guard/role/role.enum';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UserStatus, UserType } from 'prisma/generated/enums';
import { CreateUserDto } from 'src/modules/auth/dto/create-user.dto';
import { UpdateUserDto } from 'src/modules/auth/dto/update-user.dto';
import { Request } from 'express';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@ApiBearerAuth()
@ApiTags('User')
@ApiBearerAuth(SWAGGER_AUTH.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '[ADMIN] Create a user',
    description: 'Create a new user with auto-activation (admin only)',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Email or phone already exists' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createUserByAdmin(
    @Body() createUserDto: CreateUserDto,
    @Req() req: Request,
  ) {
    const adminId = (req.user as any).userId;
    return this.userService.createUserByAdmin(createUserDto, adminId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieve users with filtering options',
  })
  @ApiQuery({
    name: 'church_id',
    required: false,
    description: 'Filter by church ID',
  })
  @ApiQuery({
    name: 'type',
    enum: UserType,
    required: false,
    description: 'Filter by user type',
  })
  @ApiQuery({
    name: 'status',
    enum: UserStatus,
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by name, email, or phone',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 10,
  })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getAllUsers(
    @Req() req: Request,
    @Query('church_id') church_id?: string,
    @Query('type') type?: UserType,
    @Query('status') status?: UserStatus,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const currentUserId = (req.user as any).userId;

    // Validate status is valid UserStatus enum
    let validStatus: UserStatus | undefined;
    if (status) {
      // Check if the provided status exists in UserStatus enum
      if (Object.values(UserStatus).includes(status as UserStatus)) {
        validStatus = status as UserStatus;
      } else {
        throw new BadRequestException(
          `Invalid status value. Must be one of: ${Object.values(UserStatus).join(', ')}`,
        );
      }
    }

    // Validate type similarly
    let validType: UserType | undefined;
    if (type) {
      if (Object.values(UserType).includes(type as UserType)) {
        validType = type as UserType;
      } else {
        throw new BadRequestException(
          `Invalid type value. Must be one of: ${Object.values(UserType).join(', ')}`,
        );
      }
    }

    return this.userService.getAllUsers(currentUserId, {
      church_id,
      type: validType,
      status: validStatus,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[ADMIN] Update user status',
    description: 'Activate, suspend, or reject a user',
  })
  @ApiBody({ type: UpdateUserStatusDto })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    const adminId = (req.user as any).userId;
    return this.userService.updateUserStatus(id, dto, adminId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.CHURCH_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user information' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateUser(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const adminId = (req.user as any).userId;
    return this.userService.updateUser(id, updateUserDto, adminId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Delete user (soft delete)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete own account' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteUser(@Req() req: Request, @Param('id') id: string) {
    const adminId = (req.user as any).userId;
    return this.userService.deleteUser(id, adminId);
  }
}
