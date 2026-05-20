// src/modules/church-members/church-members.controller.ts
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
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { GetMembersDto } from './dto/get-members.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { ChurchMembersService } from './members-directory.service';

@ApiTags('Church Members')
@ApiBearerAuth(SWAGGER_AUTH.CHURCH_ADMIN)
@Controller('church/members')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CHURCH_ADMIN, Role.SUPER_ADMIN, Role.ADMIN)
export class ChurchMembersController {
  constructor(private readonly membersService: ChurchMembersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all members of the church' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'search', required: false, example: 'John' })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'inactive'] })
  @ApiQuery({ name: 'role', required: false, example: 'pastor' })
  @ApiQuery({ name: 'sortBy', required: false, example: 'created_at' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async getMembers(@Request() req, @Query() query: GetMembersDto) {
    return this.membersService.getChurchMembers(req.user.userId, query);
  }

  @Get('assignable-roles')
  @ApiOperation({ summary: 'Get roles that current admin can assign' })
  @ApiResponse({
    status: 200,
    description: 'Assignable roles fetched successfully',
    schema: {
      example: {
        success: true,
        message: 'Assignable roles fetched successfully',
        data: [
          {
            id: 'role_123',
            name: 'HELPER',
            title: 'Helper',
            description: 'Can help with church services and activities',
          },
          {
            id: 'role_456',
            name: 'CHURCH_MEMBER',
            title: 'Church Member',
            description: 'Regular church member with access to member features',
          },
        ],
      },
    },
  })
  async getAssignableRoles(@Request() req) {
    return this.membersService.getAssignableRoles(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get member by ID' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiResponse({
    status: 200,
    description: 'Member fetched successfully',
  })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async getMemberById(@Request() req, @Param('id') id: string) {
    return this.membersService.getMemberById(req.user.userId, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new member to the church' })
  @ApiBody({ type: CreateMemberDto })
  @ApiResponse({
    status: 201,
    description: 'Member added successfully',
    schema: {
      example: {
        success: true,
        message: 'Member created and added to church successfully',
        data: {
          id: 'user_123',
          first_name: 'John',
          last_name: 'Smith',
          email: 'john@example.com',
          phone: '+1234567890',
          church_id: 'church_123',
          church_name: 'Grace Community Church',
          role: 'CHURCH_MEMBER',
          church_role: 'Member',
          temporary_password: 'TempPass@123',
        },
      },
    },
  })
  async addMember(@Request() req, @Body() dto: CreateMemberDto) {
    return this.membersService.addMember(req.user.userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a member' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiBody({ type: UpdateMemberDto })
  @ApiResponse({
    status: 200,
    description: 'Member updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Member not found' })
  async updateMember(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.updateMember(req.user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from church (soft delete)' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiResponse({
    status: 200,
    description: 'Member removed from church successfully',
  })
  async removeMember(@Request() req, @Param('id') id: string) {
    return this.membersService.removeMember(req.user.userId, id);
  }
}
