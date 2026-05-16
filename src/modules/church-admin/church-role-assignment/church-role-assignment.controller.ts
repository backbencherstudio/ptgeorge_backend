// src/modules/church-admin/church-role-assignment/church-role-assignment.controller.ts
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
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ChurchRoleAssignmentService } from './church-role-assignment.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/modules/auth/guards/permissions.guard';
import { RequirePermission } from 'src/modules/auth/decorators/require-permission.decorator';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';

@ApiTags('Church Role Assignment')
@ApiBearerAuth(SWAGGER_AUTH.CHURCH_MAIN_ADMIN)
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
